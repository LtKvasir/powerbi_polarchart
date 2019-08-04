/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";
import "@babel/polyfill";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import * as _ from "lodash-es";

// -------------------------------- MAIN IMPORTS -------------------------------------
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette
import IViewport = powerbi.IViewport;

import VisualObjectInstance = powerbi.VisualObjectInstance;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import DataView = powerbi.DataView;
import DataViewObjects = powerbi.DataViewObjects;

import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;

import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;



// ------------------------------ POWERBI LIBRARIES ----------------------------------
import {
    TooltipEventArgs,
    ITooltipServiceWrapper,
    TooltipEnabledDataPoint,
    createTooltipServiceWrapper
} from "powerbi-visuals-utils-tooltiputils";
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";
import { valueFormatter, textMeasurementService } from "powerbi-visuals-utils-formattingutils";

import TextMeasurementService = textMeasurementService.textMeasurementService;

import { createLinearColorScale, LinearColorScale, ColorHelper } from "powerbi-visuals-utils-colorutils";
// import { axis } from "powerbi-visuals-utils-chartutils";

import { manipulation } from "powerbi-visuals-utils-svgutils";
import translate = manipulation.translate;

import * as d3 from "d3";


// ---------------------------- A FEW D3 DEFINITIONS ---------------------------------
type Selection<T> = d3.Selection<any, T, any, any>;
type D3Element =
    Selection<any>;

// ------------------------------ SETTINGS AND STUFF ---------------------------------
import {
    Settings,
    colorbrewer
} from "./settings";

import {
    // IMargin, ChartSizes, ChartData, DataPoint, Group, BgSegment, IColorArray, IColorBrewerSettings, FieldLine
    IMargin, ChartSizes, ChartData, DataPoint, Measure, BgSegment, IColorArray, IColorBrewerSettings, FieldLine, GroupLabelData
} from "./dataInterfaces";

import {
    getCategoryAxisHeight,
    getCartFromPolar,
    getTextSize,
    getColorScale,
    getRangePoints,
    isSelectionIdInArray,
    isSelectionKeyInArray,
    syncSelectionState,
    getAnimationMode,
    wrap,
    truncateTextIfNeeded,
    textLimit

} from "./utilities";
import { text, group } from "d3";
import { numberFormat } from "powerbi-visuals-utils-formattingutils/lib/src/formattingService/formattingService";
import { version, any } from "bluebird";


export class ViEvac_PolarChart implements IVisual {
    // ----------------------------- NECESSARY BASICS ------------------------------------
    private host: IVisualHost;

    private svg: Selection<any>;
    private div: Selection<any>;
    private mainChart: Selection<any>;
    private dataView: DataView;
    private viewport: IViewport;
    private chartData: ChartData;


    private target: HTMLElement;
    private updateCount: number;
    private settings: Settings;
    private textNode: Text;
    private element: HTMLElement;
    private colorPalette: IColorPalette;

    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private selectionIdBuilder: ISelectionIdBuilder;
    private selectionManager: ISelectionManager;
    private dataSelection: Selection<DataPoint>;



    // ----------------------------- BASIC SETTINGS --------------------------------------
    private margin: IMargin = { left: 5, right: 5, bottom: 5, top: 5 };
    private chartSizes: ChartSizes = {
        vpHeight: 0,
        vpWidth: 0,
        radarR: 0,
        radarCX: 0,
        radarCY: 0,
        axisLabelHeight: 0,
        angleOffSet: -90,
        legendHeight: 0,
    };

    private static animationDuration: number = 1000;
    private static DataStepMaxLimit: number = 10;
    private static DataStepMinLimit: number = 1;
    private static DefaultColorbrewer: string = "Reds";
    private static innerOffsetLimitFactor: number = 0.5;
    private static minPointRadius: number = 2;
    private static symbolCorrectionFactor: number = 3.5;
    private static maxDataFieldAngle: number = 360 / 12;

    private static BucketCountMaxLimit: number = 18;
    private static BucketCountMinLimit: number = 2;

    private static LabelOffsetDX: number = 2;
    private static LabelOffsetDY: number = 2;

    private CategoryLabelOffset: number = 5;
    private LegendLabelOffset: number = 4;

    private static SelectOpacity: number = 1.0;
    private static DeSelectOpacity: number = 0.2;

    private static LegendAttrDistance: number = 5;

    // ----------------------------- FOR PROPERTY PANE -----------------------------------
    private static GroupPropertyIdentifier: DataViewObjectPropertyIdentifier = {
        objectName: "colorSelector",
        propertyName: "fill"
    };


    // ----------------------------- USELESS CONSTANTS  ----------------------------------
    private static AttrX: string = "x";
    private static AttrY: string = "y";
    private static AttrCX: string = "cx";
    private static AttrCY: string = "cy";
    private static AttrRadius: string = "r";
    private static AttrX1: string = "x1";
    private static AttrY1: string = "y1";
    private static AttrX2: string = "x2";
    private static AttrY2: string = "y2";
    private static AttrDX: string = "dx";
    private static AttrDY: string = "dy";
    private static AttrHeight: string = "height";
    private static AttrWidth: string = "width";
    private static AttrTransform: string = "transform";

    private static HtmlObjTitle: string = "title";
    private static HtmlObjSvg: string = "svg";
    private static HtmlObjDiv: string = "div";
    private static HtmlObjG: string = "g";
    private static HtmlObjText: string = "text";
    private static HtmlObjRect: string = "rect";
    private static HtmlObjCircle: string = "circle";
    private static HtmlObjLine: string = "line";
    private static HtmlObjTspan: string = "tspan";
    private static HtmlObjPath: string = "path";
    private static HtmlPathLink: string = "xlink:href";
    private static HtmlTextPath: string = "textPath";

    private static StTextAnchor: string = "text-anchor";
    private static StFontSize: string = "font-size";
    private static StFontFamily: string = "font-family";
    private static StFill: string = "fill";
    private static StOpacity: string = "opacity";
    private static StStroke: string = "stroke";
    private static StStrokeWidth: string = "stroke-width"

    private static ConstEnd: string = "end";
    private static ConstBegin: string = "begin";
    private static ConstStart: string = "start";
    private static ConstMiddle: string = "middle";
    private static Const0em: string = "0em";
    private static Const071em: string = ".71em";

    private static d3Symbols: string[] = ['symbolCircle', 'symbolCross', 'symbolDiamond', 'symbolSquare', 'symbolStar', 'symbolTriangle', 'symbolWye'];


    // ------------------------------------ CLASSES  -------------------------------------
    private static ClsAll: string = "*";
    private static ClsDivChart: string = "divViEvac_PolarChart"
    private static ClsSvgChart: string = "svgViEvac_PolarChart"
    private static ClsMainChart: string = "ViEveac_mainChart"
    private static ClsAxisWrapper: string = "DataAxisWrapper"
    private static ClsLegendWrapper: string = "LegendWrapper"
    private static ClsLegendLabel: string = "LegendLabel"
    private static ClsImpactLegendWrapper: string = "ImpactLegend"
    private static ClsGroupLegendWrapper: string = "GroupLegend"
    private static ClsAxisLevels: string = "DataAxisLevels"
    private static ClsAxisLabels: string = "DataAxisLabels"
    private static ClsCategoryAxisLines: string = "CategoryAxisLines"
    private static ClsCategoryAxisSegments: string = "CategoryAxisSegments"
    private static ClsCategoryAxisLabels: string = "CategoryAxisLabels"
    private static ClsCategoryAxisLabelTexts: string = "CategoryAxisLabelText"
    private static ClsCategorySegment: string = "CatSegment_"
    private static ClsDataRing: string = "DataRing_"
    private static ClsDataCircles: string = "DataPoint"
    private static ClsGroupLines: string = "GroupLine"
    private static ClsLegend: string = "Legend";


    /**
     * Converts the PowerBI input data (from the databinding) to a format that we can work with ...
     * @param dataView 
     */
    public converter(dataView: DataView): ChartData {

        // We first check if there is any data at all ...
        if (!dataView
            || !dataView.categorical
            || !dataView.categorical.categories
            || !dataView.categorical.categories[0]
            || !dataView.categorical.categories[0].values
            || !dataView.categorical.categories[0].values.length
            || !dataView.categorical.values
            || !dataView.categorical.values[0]
            || !dataView.categorical.values[0].values
            || !dataView.categorical.values[0].values.length
        ) {
            return <ChartData>{
                dataPoints: null
            }
        }

        // now we need some things be defined correctly ...
        let categoryValueFormatter: valueFormatter.IValueFormatter;
        let valuesFormatter: valueFormatter.IValueFormatter;
        let dataPoints: DataPoint[] = [];
        let tempDataPoints: DataPoint[] = [];


        // We create the formatter that helps us then to output the correct types and format ...
        categoryValueFormatter = valueFormatter.create({
            format: valueFormatter.getFormatStringByColumn(dataView.categorical.categories[0].source),
            value: dataView.categorical.categories[0].values[0]
        });

        valuesFormatter = valueFormatter.create({
            format: valueFormatter.getFormatStringByColumn(dataView.categorical.values[0].source),
            value: dataView.categorical.values[0].values[0]

        });

        // and now we get the stuff done. So I'll explain: We first do a temporary array, where we 
        // will get all datapoints there are ... 
        let lastIdx = dataView.categorical.categories.length - 1

        dataView.categorical.categories[lastIdx].values.forEach((category, index) => {
            // now cycle through every group (group) within the category
            dataView.categorical.values.forEach((groupArray, groupIdx) => {
                // get the formatting (why ever) ...
                let groupFormatter = valueFormatter.create({
                    format: groupArray.source.format,
                    value: dataView.categorical.values[lastIdx].values[lastIdx]
                });

                // we do strange things for selections ...
                let selectionIdBuilder: ISelectionIdBuilder = this.host.createSelectionIdBuilder();

                let identity: any = selectionIdBuilder
                    .withCategory(dataView.categorical.categories[lastIdx], index)
                    .withSeries(dataView.categorical.values, dataView.categorical.values[groupIdx])
                    .createSelectionId();


                // now - more interesting - get the group and values. Let's push 'em to data points ...
                // first get the categories array by looping through 'em ...
                let category: string[] = []
                dataView.categorical.categories.forEach(v => {
                    category.push(v.values[index].toString())
                })

                // colors are difficult. We use some helpers and things ...
                let initialColor = this.colorPalette.getColor(<string>groupArray.source.groupName).value;
                // let parsedColor: string = this.getColor(
                //     ViEvac_PolarChart.GroupPropertyIdentifier,
                //     initialColor,
                //     dataView.metadata.objects,
                //     name
                // );

                // now we assemble the temporary array. We do use the dataPoint interface for convenience issues 
                // and fill not used thingies with empties ...
                tempDataPoints.push({
                    category: category,
                    uniqueCategory: category.join('-'),
                    group: <string>groupArray.source.groupName,
                    values: [{
                        measureName: <string>groupArray.source.displayName,
                        measureValue: <string>groupArray.values[index]
                    }],
                    color: initialColor,
                    identity: identity,
                    selected: false
                })
            });
        });

        // ok. now we do have separate datapoints for things that do belong together. 
        // we first create the unique arrays (which are ok already) then we'll loop and merge 'em
        // create the data and return it ...

        var groups = tempDataPoints.map(v => v.group).filter((value, index, self) => {
            return self.indexOf(value) === index;
        })

        var uniqueCategories = tempDataPoints.map(v => v.uniqueCategory).filter((value, index, self) => {
            return self.indexOf(value) === index;
        })
        uniqueCategories.sort()
        // uniqueCategories.sort().reverse() // TBD: ENABLE SORT DIRECTION IN SETTINGS ...

        var categories = []
        for (let idx = 0; idx < tempDataPoints[0].category.length; idx++) {
            categories.push(
                tempDataPoints.map(v => v.category[idx]).filter((value, index, self) => {
                    return self.indexOf(value) === index;
                })
            )
        }

        // loop 'em ... do it ... do it ... do it ...
        uniqueCategories.forEach((uCat) => {
            // get all the data points in one unique category ...
            let uCatDPoints = tempDataPoints.filter(function (dPoint) {
                return dPoint.uniqueCategory == uCat
            })

            uCatDPoints.map(v => v.group).filter((value, index, self) => {
                return self.indexOf(value) === index;
            }).forEach(group => {
                // cycling through all groups there are within this unique category ...
                // We now need to get each (temporary) dataPoint and merge them to one ...
                // first we need to get all values (which are in the different temporary dataPoints) ...
                let uValues: Measure[] = []
                uCatDPoints.filter(function (dPoint) {
                    return dPoint.group == group
                }).forEach((dPoint, i) => {
                    dPoint.values.forEach(v => { uValues.push(v) })
                })

                // next we extract the data that is common for each of the data in one unique category and group ...
                let thePoint: DataPoint = uCatDPoints.find(dPoint => {
                    return dPoint.group == group
                })

                // doing tooltips (hard work again - why do we do it in this veeery general way?) ...
                let tooltipArray = []
                thePoint.category.forEach((category, idx) => {
                    tooltipArray.push(
                        {
                            displayName: <string>dataView.categorical.categories[idx].source.displayName,
                            value: (category || "").toString()
                        }
                    )
                })

                let grpIdx = dataView.metadata.columns.map(v => v.roles).findIndex(role => {
                    return ("Groups" in role)
                })
                tooltipArray.push({
                    displayName: (dataView.metadata.columns[grpIdx].displayName || "Group"),
                    value: (thePoint.group || "").toString()
                    // color: "" TBD: ADD COLOR ...
                })

                uValues.forEach(v => {
                    tooltipArray.push(
                        {
                            displayName: v.measureName,
                            value: (v.measureValue || "").toString()
                        }
                    )
                })

                // replace the Values and push the dataPoint - and we're done here (hard work it was ...)
                thePoint.values = uValues
                thePoint.tooltipInfo = tooltipArray
                dataPoints.push(thePoint);
            })
        })

        // and return it we do ...
        return <ChartData>{
            dataPoints: dataPoints,
            uniqueCategories: uniqueCategories,
            categories: categories,
            groups: groups,
            valueFormatter: valueFormatter,
            categoryValueFormatter: categoryValueFormatter
        }
    }

    /**
     * Constructs the visual at the veeeeeeeeeeeeeeeeery basic level.
     * @param options 
     */
    constructor({ host, element }: VisualConstructorOptions) {
        this.host = host;
        this.element = element;
        this.colorPalette = host.colorPalette

        // add the div and svg element to the Browser/PowerBI ...
        this.div = d3.select(element)
            .append(ViEvac_PolarChart.HtmlObjDiv)
            .classed(ViEvac_PolarChart.ClsDivChart, true);

        this.svg = this.div
            .append(ViEvac_PolarChart.HtmlObjSvg)
            .classed(ViEvac_PolarChart.ClsSvgChart, true);

        // and we need our wrapper for the tooltips ...
        this.tooltipServiceWrapper = createTooltipServiceWrapper(
            this.host.tooltipService,
            element);

        this.selectionIdBuilder = this.host.createSelectionIdBuilder();
    }

    /**
     * This is probably the most important function of our PowerBi Visual. It basically
     * renders ALL elements and is simply AWESOME ...
     * @param options 
     */
    public update(options: VisualUpdateOptions) {
        // if there is no data, we simply return ...
        if (!options.dataViews || !options.dataViews[0]) {
            return;
        }

        // there is data so we do something, unless there is an exception (u never guessed, did you?) ...
        try {
            // parse and retrieve the settings and then remove everything (muahahahahahaha) ...
            this.settings = ViEvac_PolarChart.parseSettings(options.dataViews[0]);
            this.svg.selectAll(ViEvac_PolarChart.ClsAll).remove();

            // now set the div and svg sizes accordubg to the viewport's size (makes sense, doesn't it?) ...
            this.div.attr(ViEvac_PolarChart.AttrWidth, PixelConverter.toString(options.viewport.width));
            this.div.attr(ViEvac_PolarChart.AttrHeight, PixelConverter.toString(options.viewport.height));

            this.svg.attr(ViEvac_PolarChart.AttrWidth, options.viewport.width - this.margin.left - this.margin.right);
            this.svg.attr(ViEvac_PolarChart.AttrHeight, options.viewport.height - this.margin.top - this.margin.bottom);
            this.svg.attr(ViEvac_PolarChart.AttrTransform, translate(this.margin.left, this.margin.top));

            // get our data (kinda important) ...
            let dataView: DataView = this.dataView = options.dataViews[0];
            this.chartData = this.converter(dataView);

            // do selection things ...
            this.selectionManager = this.host.createSelectionManager();

            // and some animation things ...
            var suppressAnimations: boolean = false;

            // set size variables within the class for further use  ...
            this.setChartSizes(options.viewport, this.chartData)

            // also prepare some necessary variables for further use ...
            let angleOffSet = this.settings.categoryAxis.angleOffSet
            let dataPointAngle = 360 / this.chartData.dataPoints.length
            let datafieldAngle = 360 / this.chartData.uniqueCategories.length
            let DataAxisMinValue = this.settings.dataAxis.minValue
            let DataAxisMaxValue = this.settings.dataAxis.maxValue
            let steps = this.settings.dataAxis.steps

            // we need "this" stored so we can access it in callbacks ...
            let self = this

            // we need to set min and max values if needed ...
            if (this.chartData.dataPoints && !(this.settings.dataAxis.maxValue > this.settings.dataAxis.minValue)) {
                DataAxisMinValue = d3.min(this.chartData.dataPoints, function (d: DataPoint) {
                    return Number(d.values[0].measureValue);
                });
                DataAxisMaxValue = d3.max(this.chartData.dataPoints, function (d: DataPoint) {
                    return Number(d.values[0].measureValue);;
                });
            }

            // scales ...
            var dataScale = this.getDataScale(this.chartData)
            var fieldScale = d3.scaleBand()
                .domain(this.chartData.uniqueCategories)
                .range([angleOffSet, angleOffSet + 360]);

            // and a few data related variables ...
            // TBD: FIX THAT 0 ...
            let categorySizes = this.chartData.categories[0].map(value => {
                let lastIdx = (this.chartData.dataPoints.map(v => v.category[0]).lastIndexOf(value))
                let firstIdx = (this.chartData.dataPoints.map(v => v.category[0]).indexOf(value))
                return {
                    category: value,
                    size: (lastIdx - firstIdx + 1),
                    startIndex: firstIdx,
                    lastIndex: lastIdx,
                    startAngle: (fieldScale(this.chartData.dataPoints[firstIdx].uniqueCategory) + 90) * Math.PI / 180,
                    endAngle: (fieldScale(this.chartData.dataPoints[lastIdx].uniqueCategory) + 90) * Math.PI / 180
                }
            })

            // and append the main chart as group ...
            this.mainChart = this.svg.append(ViEvac_PolarChart.HtmlObjG)
                .classed(ViEvac_PolarChart.ClsMainChart, true)
                .attr(ViEvac_PolarChart.AttrTransform, translate(this.chartSizes.radarCX, this.chartSizes.radarCY))


            // ---------------------------------------------------------------------------------
            // next we do care about the background, which means circles (update: arcs) ftw ...
            // ---------------------------------------------------------------------------------

            // let's get to the middle of it, won't we? Start by removing and then drawing the axis wrapper group again ...
            d3.select("." + ViEvac_PolarChart.ClsAxisWrapper).remove()
            let axisWrapper = this.mainChart
                .append(ViEvac_PolarChart.HtmlObjG)
                .classed(ViEvac_PolarChart.ClsAxisWrapper, true)

            // Filter for the outside glow ...
            if (this.settings.dataAxis.showFilter) {
                this.setFilter('glow')
            }

            // ---------------------------------------------------------------------------------
            // do we want category and data axis ?? - If so, we'll do 'em ...
            // ---------------------------------------------------------------------------------
            var bgSegments: BgSegment[] = [];

            if (this.settings.categoryAxis.show) {

                // we do need a background circle for everything (that also defines the spaces between areas) ...
                axisWrapper.append(ViEvac_PolarChart.HtmlObjCircle)
                    .classed(ViEvac_PolarChart.ClsAxisLevels, true)
                    .attr(ViEvac_PolarChart.AttrCX, 0)
                    .attr(ViEvac_PolarChart.AttrCY, 0)
                    .attr("r", dataScale((this.settings.dataAxis.invert) ? DataAxisMinValue : DataAxisMaxValue) - Math.floor(Number(this.settings.categoryAxis.strokeWidth) / 2) - 1)
                    .style(ViEvac_PolarChart.StFill, this.settings.categoryAxis.stroke)
                    .style("filter", (this.settings.dataAxis.showFilter) ? "url(#glow)" : "")

                // we also need dummy data now for each and every segment ...
                var padAngle = this.settings.categoryAxis.strokeWidth / 100
                var myArcGenerator = d3.arc()
                    .cornerRadius(this.settings.categoryAxis.cornerRadius)
                    .padRadius(100)


                // loop through all rings and all categories and push the bgSegments array ...
                for (var ring = 0; ring < this.settings.dataAxis.steps; ring++) {
                    let innerRadius = dataScale((DataAxisMaxValue - DataAxisMinValue) / steps * ring + DataAxisMinValue)
                    let outerRadius = dataScale((DataAxisMaxValue - DataAxisMinValue) / steps * (ring + 1) + DataAxisMinValue)
                    categorySizes.forEach(category => {
                        bgSegments.push(
                            {
                                innerRadius: ((this.settings.dataAxis.invert) ? outerRadius : innerRadius) + Math.ceil(Number(this.settings.categoryAxis.strokeWidth) / 2),
                                outerRadius: ((this.settings.dataAxis.invert) ? innerRadius : outerRadius) - Math.floor(Number(this.settings.categoryAxis.strokeWidth) / 2),
                                startAngle: category.startAngle,
                                endAngle: category.endAngle + datafieldAngle * Math.PI / 180,
                                category: category.category,
                                ring: ring
                            }
                        )
                    })
                };

                // we need a color scale for the rings ...
                let bgSegmentColorAxis = getColorScale({
                    inputMin: 0,
                    inputMax: this.settings.dataAxis.steps,
                    steps: this.settings.dataAxis.steps,
                    usebrewer: this.settings.dataAxis.enableColorbrewer,
                    brewer: this.settings.dataAxis.colorbrewer,
                    gradientStart: this.settings.dataAxis.gradientStart,
                    gradientEnd: this.settings.dataAxis.gradientEnd
                })

                // now add the segments ... yeeehaaaaa ...
                axisWrapper.selectAll(ViEvac_PolarChart.ClsCategoryAxisSegments)
                    .data(bgSegments)
                    .enter().append(ViEvac_PolarChart.HtmlObjPath)
                    .attr("class", function (d) {
                        // add classes: a generic one, and one for segment and ring each ...
                        let clsSegment: string = ViEvac_PolarChart.ClsCategorySegment + d.category.toString().replace(/\s/g, '-')
                        let clsRing: string = ViEvac_PolarChart.ClsDataRing

                        clsRing += d.innerRadius.toString().replace(/\s/g, '-')
                        return ViEvac_PolarChart.ClsCategoryAxisSegments + " " + clsSegment + " " + clsRing
                    })
                    .attr("id", function (d) {
                        //Also add a unique ID for each slice, which we probably won't need here ...
                        let segmentID = d.category
                        let ringID = d.innerRadius
                        return ViEvac_PolarChart.ClsCategoryAxisLabels + "_" + segmentID + "_" + ringID;
                    })
                    .attr("d", function (d, i) {
                        return myArcGenerator({
                            innerRadius: d.innerRadius,
                            outerRadius: d.outerRadius,
                            startAngle: d.startAngle,
                            endAngle: d.endAngle,
                            padAngle: padAngle,
                        })
                    })
                    .style(ViEvac_PolarChart.StFill, function (d) { return bgSegmentColorAxis.scale(d.ring) })
                    .style("filter", (this.settings.dataAxis.showFilter) ? "url(#glow)" : "")

            }

            // ---------------------------------------------------------------------------------
            // plot the Labels for the Data Axis ...
            // ---------------------------------------------------------------------------------
            if (this.settings.dataAxisLabels.show) {
                // get the necessary parameters including the labels ...
                let fontSize = this.settings.dataAxisLabels.fontSize
                let fontFamily = this.settings.dataAxisLabels.fontFamily
                let labelArray = getTextSize(
                    d3.range(1, this.settings.dataAxis.steps + 1).reverse().map(d => {
                        return ((DataAxisMaxValue - DataAxisMinValue) / steps * d + DataAxisMinValue).toString()
                    }),
                    fontSize,
                    fontFamily
                )

                // we do need dummy data for positioning of the labels  ...
                if (!this.settings.dataAxis.invert) {
                    var bgCircleData = d3.range(1, this.settings.dataAxis.steps + 1).reverse()
                } else {
                    var bgCircleData = d3.range(0, this.settings.dataAxis.steps)
                }

                // TODO: Fix this with value formatter
                let d3Formatter = d3.format(".2f")

                axisWrapper.selectAll(ViEvac_PolarChart.ClsAxisLabels)
                    .data(bgCircleData)
                    .enter()
                    .append(ViEvac_PolarChart.HtmlObjText)
                    .classed(ViEvac_PolarChart.ClsAxisLabels, true)
                    .attr(ViEvac_PolarChart.AttrX, function (d, i) {
                        return getCartFromPolar(
                            dataScale((DataAxisMaxValue - DataAxisMinValue) / steps * d + DataAxisMinValue),
                            0,
                            angleOffSet
                        ).x
                    })
                    .attr(ViEvac_PolarChart.AttrY, function (d, i) {
                        return getCartFromPolar(
                            dataScale((DataAxisMaxValue - DataAxisMinValue) / steps * d + DataAxisMinValue),
                            0,
                            angleOffSet
                        ).y
                    })
                    .attr(ViEvac_PolarChart.StFill, this.settings.dataAxisLabels.color)
                    .style(ViEvac_PolarChart.StFontSize, fontSize)
                    .style(ViEvac_PolarChart.StFontFamily, fontFamily)
                    .style(ViEvac_PolarChart.StTextAnchor, (Math.cos(angleOffSet * Math.PI / 180) < 0) ? ViEvac_PolarChart.ConstStart : ViEvac_PolarChart.ConstEnd)
                    .text(function (d, i) {
                        return d3Formatter((DataAxisMaxValue - DataAxisMinValue) / steps * d + DataAxisMinValue)
                    })
                    .attr(ViEvac_PolarChart.AttrDY, function (d, i) {
                        // calculate the text size and then (depending on the offset angle position the thing ...)
                        let offset = (Math.sin(angleOffSet * Math.PI / 180) < 0) ? ViEvac_PolarChart.LabelOffsetDY : - 1 * ViEvac_PolarChart.LabelOffsetDY
                        return Math.max(Math.sin(angleOffSet * Math.PI / 180) * (-labelArray.height) +
                            Math.cos(angleOffSet * Math.PI / 180) * -(labelArray.width), 0) + offset
                    })
                    .attr(ViEvac_PolarChart.AttrDX, (Math.cos(angleOffSet * Math.PI / 180) < 0) ? ViEvac_PolarChart.LabelOffsetDX : -1 * ViEvac_PolarChart.LabelOffsetDX)
            }

            // ---------------------------------------------------------------------------------
            // now plot the category axis labels (which actually is quite tricky) ...
            // ---------------------------------------------------------------------------------
            if (this.settings.categoryAxisLabels) {
                // we do need to distinguish if we have a two-dimensional category set or only one category
                if (this.chartData.uniqueCategories.length == 0 || this.chartData.categories.length == 1) {
                } else {
                    // we have two dimensional data which means we will place arcs outside the circle to add labels
                    // We start by defining arcs for the text paths ...
                    let innerRadius = dataScale((this.settings.dataAxis.invert) ? DataAxisMinValue : DataAxisMaxValue) + this.CategoryLabelOffset
                    let outerRadius = dataScale((this.settings.dataAxis.invert) ? DataAxisMinValue : DataAxisMaxValue) + this.chartSizes.axisLabelHeight + this.CategoryLabelOffset

                    // we do need a new arc generator as we may not have rounded corners (to extract arcs) ...
                    var labelArcGenerator = d3.arc()
                        .cornerRadius(0)
                        .padRadius(100)

                    axisWrapper.selectAll(ViEvac_PolarChart.ClsCategoryAxisLabels)
                        .data(categorySizes)
                        .enter().append(ViEvac_PolarChart.HtmlObjPath)
                        .classed(ViEvac_PolarChart.ClsCategoryAxisLabels, true)
                        .attr("d", function (d, i) {
                            return labelArcGenerator({
                                innerRadius: innerRadius,
                                outerRadius: outerRadius,
                                startAngle: (d.startIndex * dataPointAngle + angleOffSet + 90) * Math.PI / 180,
                                endAngle: ((d.lastIndex + 1) * dataPointAngle + angleOffSet + 90) * Math.PI / 180,
                            })
                        })
                        .style("fill", (this.settings.categoryAxisLabels.fill) ? this.settings.categoryAxisLabels.fillColor : "none")
                        .each(function (d, i) {
                            // remove all path lines of the arc except the outer one ...
                            var firstArcSection = /(^.+?)L/;
                            var newArc = firstArcSection.exec(d3.select(this).attr("d"))[1];
                            newArc = newArc.replace(/,/g, " ");

                            // flip text in the lower half of the radar ...
                            let lastAngle = ((d.lastIndex + 1) * dataPointAngle + angleOffSet) * Math.PI / 180

                            if (Math.sin(lastAngle) > 0) {

                                // get the path details ...
                                var startLoc = /M(.*?)A/;
                                var middleLoc = /A(.*?)0 0 1/;
                                var endLoc = /0 0 1 (.*?)$/;

                                //Flip the direction of the arc by switching the start and end point
                                //and using a 0 (instead of 1) sweep flag
                                var newStart = endLoc.exec(newArc)[1];
                                var newEnd = startLoc.exec(newArc)[1];
                                var middleSec = middleLoc.exec(newArc)[1];

                                //Build up the new arc notation, set the sweep-flag to 0
                                newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
                            }

                            // now create a new path we want to add our text to ...
                            axisWrapper.append(ViEvac_PolarChart.HtmlObjPath)
                                .classed(ViEvac_PolarChart.ClsCategoryAxisLabels, true)
                                .attr("id", ViEvac_PolarChart.ClsCategoryAxisLabels + i)
                                .attr("d", newArc)
                                .style("fill", "none")
                        })

                    // now append the category names to the arcs ...
                    let textOrientation = ["2%", "98%"]
                    let textAnchor = [ViEvac_PolarChart.ConstBegin, ViEvac_PolarChart.ConstEnd]
                    if (this.settings.categoryAxisLabels.orientation == "middle") {
                        textOrientation = ["50%", "50%"]
                        textAnchor = [ViEvac_PolarChart.ConstMiddle, ViEvac_PolarChart.ConstMiddle]
                    } else if (this.settings.categoryAxisLabels.orientation == "end") {
                        textOrientation = ["98%", "2%"]
                        textAnchor = [ViEvac_PolarChart.ConstEnd, ViEvac_PolarChart.ConstBegin]

                    }

                    // we create the arcs for the labels. As we want to be able to center the text this is going to be tricky
                    // and done with cut arc paths by regular expressions ...
                    let chartDY = this.chartSizes.axisLabelHeight

                    axisWrapper.selectAll(ViEvac_PolarChart.ClsCategoryAxisLabelTexts)
                        .data(categorySizes)
                        .enter().append(ViEvac_PolarChart.HtmlObjText)
                        .classed(ViEvac_PolarChart.ClsCategoryAxisLabelTexts, true)
                        .attr(ViEvac_PolarChart.AttrDY, function (d) {
                            // do a different DY if text is turned ...
                            let lastAngle = ((d.lastIndex + 1) * dataPointAngle + angleOffSet) * Math.PI / 180
                            return (Math.sin(lastAngle) > 0) ? -chartDY / 2 : chartDY
                        })
                        .append(ViEvac_PolarChart.HtmlTextPath)
                        .attr("startOffset", function (d) {
                            // if we turn the text we need to turn orientation too ...
                            let lastAngle = ((d.lastIndex + 1) * dataPointAngle + angleOffSet) * Math.PI / 180
                            return (Math.sin(lastAngle) > 0) ? textOrientation[1] : textOrientation[0]
                        })
                        .attr(ViEvac_PolarChart.HtmlPathLink, function (d, i) {
                            // link to the ID of the path ...
                            return "#" + ViEvac_PolarChart.ClsCategoryAxisLabels + i
                        })
                        .text(function (d) { return d.category.toString() })
                        .attr(ViEvac_PolarChart.StFill, this.settings.categoryAxisLabels.color)
                        .style(ViEvac_PolarChart.StTextAnchor, function (d) {
                            // if we turn the text we need to turn orientation too ...
                            let lastAngle = ((d.lastIndex + 1) * dataPointAngle + angleOffSet) * Math.PI / 180
                            return (Math.sin(lastAngle) > 0) ? textAnchor[1] : textAnchor[0]
                        })
                        .style(ViEvac_PolarChart.StFontSize, this.settings.categoryAxisLabels.fontSize)
                        .style(ViEvac_PolarChart.StFontFamily, this.settings.categoryAxisLabels.fontFamily)
                }
            }

            // ---------------------------------------------------------------------------------
            // finally we plot the data. This should be easy compared to what we've been through
            // ---------------------------------------------------------------------------------

            // we do need a scale for size and for color ...
            if (this.settings.impact.show) {
                var impactScale = this.getImpactScale(this.chartData, this.settings)
            }
            if (this.settings.preparedness.show) {
                var preparednessScale = this.getPreparednessScale(this.chartData, this.settings)
            }

            // we calculate the radius of half the radar and scale it with our overlapping factor to get data size
            // However there are a few things ... we don't want it to be more than 1/12 of an circle and we might
            // want a fixed size instead of a factor (in case we select points and want sizes to stay constant)
            let radarHalfR = dataScale((DataAxisMaxValue - DataAxisMinValue) / 2 + DataAxisMinValue)
            let dataCircleR: number = 0

            if (this.settings.dataBasics.useFixedRadius) {
                // fixed radius. We still check for too large we do ...
                let maxDataPointR = radarHalfR * ViEvac_PolarChart.maxDataFieldAngle / 2 * Math.PI / 180 -
                    this.settings.impact.minPointRadius
                dataCircleR = Math.min(this.settings.dataBasics.scaleFactor, maxDataPointR)
            } else {
                // dynamic data ...
                let maxDataFieldAngle = this.settings.dataBasics.scaleFactor * datafieldAngle
                maxDataFieldAngle = Math.min(ViEvac_PolarChart.maxDataFieldAngle, maxDataFieldAngle)

                dataCircleR = radarHalfR * maxDataFieldAngle / 2 * Math.PI / 180 -
                    this.settings.impact.minPointRadius
            }



            // we start with lines (and later do circles) ...
            // FIX THAT 0 ...
            var lineData: FieldLine[] = []
            if (this.settings.groups.showLines) {
                // data for the lines: we cycle all fields and extract the points for this field ...
                this.chartData.uniqueCategories.forEach(field => {
                    let fieldData = this.chartData.dataPoints.filter(dataPoint => dataPoint.uniqueCategory == field)

                    // now get the data with max and min value (distance to center) ...
                    let maxFieldData = _.maxBy(fieldData, data => {
                        return Number(data.values[0].measureValue)
                    })

                    let minFieldData = _.minBy(fieldData, data => {
                        return Number(data.values[0].measureValue)
                    })

                    let selectionIdBuilder: ISelectionIdBuilder = this.host.createSelectionIdBuilder();
                    let lastIdx = maxFieldData.category.length - 1

                    lineData.push({
                        minValue: minFieldData.values[0].measureValue,
                        maxValue: maxFieldData.values[0].measureValue,
                        colorGroup: maxFieldData.color,
                        fieldID: maxFieldData.uniqueCategory,
                        identity: selectionIdBuilder
                            .withCategory(dataView.categorical.categories[lastIdx], dataView.categorical.categories[lastIdx].values.indexOf(maxFieldData.category[lastIdx]))
                            .createSelectionId()
                    })
                })

                // do the DOM thingies ...
                let groupLines: Selection<FieldLine> = this.mainChart.selectAll("." + ViEvac_PolarChart.ClsGroupLines)
                let groupLinesData = groupLines.data(lineData)
                let groupLinesEntered = groupLinesData
                    .enter()
                    .append(ViEvac_PolarChart.HtmlObjLine)
                var groupLinesMerged = groupLinesEntered.merge(groupLines)

                // do the lines ...
                groupLinesMerged
                    .attr(ViEvac_PolarChart.AttrX1, function (d, i) {
                        return getCartFromPolar(dataScale(Number(d.maxValue)), fieldScale(d.fieldID), datafieldAngle / 2).x
                    })
                    .attr(ViEvac_PolarChart.AttrY1, function (d, i) {
                        return getCartFromPolar(dataScale(Number(d.maxValue)), fieldScale(d.fieldID), datafieldAngle / 2).y
                    })
                    .attr(ViEvac_PolarChart.AttrX2, function (d, i) {
                        return getCartFromPolar(dataScale(Number(d.minValue)), fieldScale(d.fieldID), datafieldAngle / 2).x
                    })
                    .attr(ViEvac_PolarChart.AttrY2, function (d, i) {
                        return getCartFromPolar(dataScale(Number(d.minValue)), fieldScale(d.fieldID), datafieldAngle / 2).y
                    })
                    .style('stroke-width', this.settings.groups.strokeWidth)
                    .style('stroke', function (d, i) {
                        // either std. color (preparedness) or groups
                        return (self.settings.preparedness.show) ? self.settings.dataBasics.stroke : d.colorGroup.toString()
                        // either preparedness or groups (or none)
                    })
                    .attr("class", function (d) {
                        return ViEvac_PolarChart.ClsGroupLines + " " + ViEvac_PolarChart.ClsGroupLines + "_" + d.fieldID
                    })
                    .classed(ViEvac_PolarChart.ClsGroupLines, true)
            }

            // now do the data points itself. 
            // create some container and data things and remove DOM (whatever ...)
            let dataCircles: Selection<DataPoint> = this.mainChart.selectAll("." + ViEvac_PolarChart.ClsDataCircles)
            let dataCirclesData = dataCircles.data(this.chartData.dataPoints);

            let dataPointSettings = this.settings.dataBasics

            // cirles or no circles - that is here the question! (more than 7 groups also leads to circles) ...
            if (this.settings.groups.useSymbols && this.chartData.groups.length <= 7) {
                // symbols it is. We generate them and do the plotting ...
                let dataCirclesEntered = dataCirclesData
                    .enter()
                    .append(ViEvac_PolarChart.HtmlObjPath)
                var dataCirclesMerged = dataCirclesEntered.merge(dataCircles)

                var symbolGenerator = d3.symbol()

                // now we simply draw our data points (as easy as that) ...
                dataCirclesMerged
                    .attr('transform', function (d, i) {
                        let transX = getCartFromPolar(dataScale(Number(d.values[0].measureValue)), fieldScale(d.uniqueCategory), datafieldAngle / 2).x
                        let transY = getCartFromPolar(dataScale(Number(d.values[0].measureValue)), fieldScale(d.uniqueCategory), datafieldAngle / 2).y
                        return 'translate(' + transX + ', ' + transY + ')';
                    })
                    .attr('d', function (d) {
                        // here is magic. We need to know which group it is (get an index) and then
                        // call a symbolgenerator. However the type needs to be a symbol -> thus we call "d3"
                        // also size is radius squared by definition of symbols ...
                        let groupIdx = self.chartData.groups.indexOf(d.group)
                        let size = (self.settings.impact.show) ? dataCircleR * impactScale(d.values[1].measureValue) + self.settings.impact.minPointRadius : dataCircleR
                        symbolGenerator
                            .type(d3[ViEvac_PolarChart.d3Symbols[groupIdx]])
                            .size(ViEvac_PolarChart.symbolCorrectionFactor * Math.pow(size, 2))
                        return symbolGenerator()
                    })
            } else {
                // now we simply draw our data points (as easy as that) ...
                let dataCirclesEntered = dataCirclesData
                    .enter()
                    .append(ViEvac_PolarChart.HtmlObjCircle)
                var dataCirclesMerged = dataCirclesEntered.merge(dataCircles)

                dataCirclesMerged
                    .attr(ViEvac_PolarChart.AttrCX, function (d, i) {
                        return getCartFromPolar(dataScale(Number(d.values[0].measureValue)), fieldScale(d.uniqueCategory), datafieldAngle / 2).x
                    })
                    .attr(ViEvac_PolarChart.AttrCY, function (d, i) {
                        return getCartFromPolar(dataScale(Number(d.values[0].measureValue)), fieldScale(d.uniqueCategory), datafieldAngle / 2).y
                    })
                    .attr(ViEvac_PolarChart.AttrRadius, function (d) {
                        if (self.settings.impact.show) {
                            return dataCircleR * impactScale(d.values[1].measureValue) + self.settings.impact.minPointRadius
                        }
                        // we no fill do not ...
                        return dataCircleR
                    })
            }

            // add the other stuff and on-click
            dataCirclesMerged
                .attr('fill', function (d, i) {
                    // either preparedness or groups (or none)
                    let color = (self.settings.preparedness.show) ? preparednessScale.scale(d.values[2].measureValue) : d.color.toString()
                    return (dataPointSettings.fillArea) ? color : "None"
                })
                .style('stroke-width', this.settings.dataBasics.strokeWidth)
                .style('stroke', function (d, i) {
                    // either preparedness or groups (or none)
                    let color = (self.settings.preparedness.show) ? preparednessScale.scale(d.values[2].measureValue) : d.color.toString()
                    return (dataPointSettings.fillArea) ? dataPointSettings.stroke : color
                })
                .attr("class", (d) => {
                    // add classes: a generic one, and one for segment and ring each ...
                    let clsSegment: string = ViEvac_PolarChart.ClsCategorySegment + d.category.toString().replace(/\s/g, '-')
                    let clsRing: string = ViEvac_PolarChart.ClsDataRing
                    clsRing = clsRing + bgSegments.map(s => s.innerRadius).sort((a, b) => { return b - a }).find(function (innerRadius) {
                        return innerRadius < dataScale(Number(d.values[0].measureValue))
                    }).toString().replace(/\s/g, '-')

                    return ViEvac_PolarChart.ClsCategoryAxisSegments + " " + clsSegment + " " + clsRing
                })
                .classed(ViEvac_PolarChart.ClsDataCircles, true)
                .on("click", (d) => {
                    // Allow selection only if the visual is rendered in a view that supports interactivity (e.g. Report)
                    if (this.host.allowInteractions) {
                        // now ... on click we select this datapoint and then remove some opacity for all other points.
                        // before that we do some clicking behaviour ...
                        const isCtrlPressed: boolean = (d3.event as MouseEvent).ctrlKey;
                        self.selectionManager.select(d.identity, isCtrlPressed)
                            .then((ids: ISelectionId[]) => {
                                if (ids.length > 0) {
                                    // we do have some selected. Let's do them and the others (we do it this nasty way to be able to
                                    // also raise() the selected thingies [which just looks nicer]) ...

                                    // lines first ...
                                    getAnimationMode(groupLinesMerged.filter(d => {
                                        return !isSelectionKeyInArray(
                                            ids,
                                            d.identity,
                                            self.dataView.categorical.categories[self.dataView.categorical.categories.length - 1].source.queryName
                                        )
                                    }), suppressAnimations, ViEvac_PolarChart.animationDuration).style("stroke-opacity", ViEvac_PolarChart.DeSelectOpacity)

                                    let selectedGroupLines = groupLinesMerged.filter(d => {
                                        return isSelectionKeyInArray(
                                            ids,
                                            d.identity,
                                            self.dataView.categorical.categories[self.dataView.categorical.categories.length - 1].source.queryName
                                        )
                                    }).raise()
                                    getAnimationMode(selectedGroupLines, suppressAnimations, ViEvac_PolarChart.animationDuration)
                                        .style("stroke-opacity", ViEvac_PolarChart.SelectOpacity)

                                    // circles now ...
                                    getAnimationMode(dataCirclesMerged.filter(d => {
                                        return !isSelectionKeyInArray(
                                            ids,
                                            d.identity,
                                            self.dataView.categorical.categories[self.dataView.categorical.categories.length - 1].source.queryName
                                        )
                                    }), suppressAnimations, ViEvac_PolarChart.animationDuration)
                                        .style("fill-opacity", ViEvac_PolarChart.DeSelectOpacity)

                                    let selectedCircles = dataCirclesMerged.filter(d => {
                                        return isSelectionKeyInArray(
                                            ids,
                                            d.identity,
                                            self.dataView.categorical.categories[self.dataView.categorical.categories.length - 1].source.queryName
                                        )
                                    }).raise()
                                    getAnimationMode(selectedCircles, suppressAnimations, ViEvac_PolarChart.animationDuration)
                                        .style("fill-opacity", ViEvac_PolarChart.SelectOpacity)

                                } else {
                                    getAnimationMode(dataCirclesMerged, suppressAnimations, ViEvac_PolarChart.animationDuration)
                                        .style("fill-opacity", ViEvac_PolarChart.SelectOpacity)
                                    getAnimationMode(groupLinesMerged, suppressAnimations, ViEvac_PolarChart.animationDuration)
                                        .style("fill-opacity", ViEvac_PolarChart.SelectOpacity)
                                }
                            });

                        // stop D3 from doing something (don't know what) ...
                        (<Event>d3.event).stopPropagation();
                    }
                })

            // ---------------------------------------------------------------------------------
            // now ... what about legends? (this is going to hurt)
            // ---------------------------------------------------------------------------------

            if (this.settings.legend.show) {
                // before we start doing the legends we will have a look at the space available 
                // to keep it simple we give every legend the same space ...
                let nLeg: number = 0;
                let idxLeg: number = 0;
                if (this.settings.impact.show) { nLeg++ }
                if (this.settings.preparedness.show) { nLeg++ }
                if (this.chartData.groups.length > 1) { nLeg++ }
                let oneLegendWidth: number = this.chartSizes.vpWidth / nLeg

                // and do a DOM group
                let legendWrapper = this.svg
                    .append(ViEvac_PolarChart.HtmlObjG)
                    .classed(ViEvac_PolarChart.ClsLegendWrapper, true)
                    .attr(ViEvac_PolarChart.AttrTransform, translate(
                        0, this.chartSizes.radarCY * 2))

                // and we wanna know the height of labels ...
                let labelHeight = TextMeasurementService.measureSvgTextHeight({
                    fontSize: PixelConverter.toString(this.settings.legend.fontSize),
                    text: this.chartData.dataPoints[0].values[0].measureName.toString().trim(),
                    fontFamily: this.settings.legend.fontFamily
                })

                // -------------------------------------------------------------------------------
                // we do start with the impact ...
                if (this.settings.impact.show) {
                    // the group ...
                    let impactLegendWrapper = legendWrapper
                        .append(ViEvac_PolarChart.HtmlObjG)
                        .classed(ViEvac_PolarChart.ClsImpactLegendWrapper, true)
                        .attr(ViEvac_PolarChart.AttrTransform, translate(
                            0, 0))

                    // add the legend label ...
                    impactLegendWrapper
                        .append(ViEvac_PolarChart.HtmlObjText)
                        .classed(ViEvac_PolarChart.ClsLegendLabel, true)
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("dy", labelHeight)
                        .text(this.chartData.dataPoints[0].values[1].measureName)
                        .style("text-anchor", ViEvac_PolarChart.ConstBegin)
                        .style("fill", this.settings.legend.fill)
                        .style("font-size", this.settings.legend.fontSize)
                        .style("font-family", this.settings.legend.fontFamily);

                    // okey ... we do need the data values - which we calculate by our private method
                    let legendData = this.getImpactLegendData(impactScale)

                    // now we honestly need to check our available space. If we got more items than space we 
                    // need to cherry pick ...
                    let LegendItemRadius = dataCircleR * impactScale(legendData[legendData.length - 1].value)
                        + self.settings.impact.minPointRadius
                    let oneLegendItemWidth = 2 * LegendItemRadius + ViEvac_PolarChart.LegendAttrDistance

                    let numItems = Math.floor(oneLegendWidth / oneLegendItemWidth)
                    let toPlotlegendData = []

                    // so this next thing picks only selected items depending on how much space we have ...
                    for (var i = 0; Math.ceil(i) < legendData.length; i += Math.max(1, (legendData.length / numItems))) {
                        toPlotlegendData.push(legendData[Math.ceil(i)]);
                    }

                    // we do need to plot it now. Starting with DOM things ...
                    let legendSelection: Selection<any> = impactLegendWrapper.selectAll("." + ViEvac_PolarChart.ClsLegend);
                    let legendSelectionData = legendSelection.data(toPlotlegendData)
                    legendSelectionData
                        .exit()
                        .remove()

                    let legendSelectionEntered = legendSelectionData
                        .enter()
                        .append(ViEvac_PolarChart.HtmlObjG)

                    let legendSelectionMerged = legendSelectionEntered.merge(legendSelection);

                    // and do the circles now ...
                    legendSelectionMerged
                        .append(ViEvac_PolarChart.HtmlObjCircle)
                        .attr('cx', (d, i) => (oneLegendItemWidth * i + LegendItemRadius))
                        .attr('cy', LegendItemRadius + labelHeight + this.LegendLabelOffset)
                        .attr('r', (d, i) => {
                            return dataCircleR * Number(impactScale(d.value)) + self.settings.impact.minPointRadius
                        })
                        .attr('fill', this.settings.impact.legendColor)
                        .style('stroke-width', this.settings.dataBasics.strokeWidth + "px")
                        .style('stroke', this.settings.dataBasics.stroke)

                    // add some text we do ...
                    legendSelectionMerged
                        .append(ViEvac_PolarChart.HtmlObjText)
                        .classed(ViEvac_PolarChart.ClsLegendLabel, true)
                        .attr("x", (d, i) => (oneLegendItemWidth * i + LegendItemRadius))
                        .attr("y", labelHeight + 2 * (LegendItemRadius + this.LegendLabelOffset))
                        .text(function (d) {
                            return d.value.toFixed(0)
                        })
                        .attr("dy", labelHeight / 2)
                        .style("text-anchor", ViEvac_PolarChart.ConstMiddle)
                        .style("fill", this.settings.legend.fill)
                        .style("font-size", this.settings.legend.fontSize)
                        .style("font-family", this.settings.legend.fontFamily);

                    // and add the tooltip (this seems just to be how the library works ...)
                    this.tooltipServiceWrapper.addTooltip(
                        legendSelectionMerged,
                        (tooltipEvent: TooltipEventArgs<TooltipEnabledDataPoint>) => {
                            return tooltipEvent.data.tooltipInfo;
                        }
                    );

                    // at the end increase the idx ..
                    idxLeg++
                }

                // -------------------------------------------------------------------------------
                // groups next ...
                if (this.chartData.groups.length > 1) {
                    // the group ...
                    let groupLegendWrapper = legendWrapper
                        .append(ViEvac_PolarChart.HtmlObjG)
                        .classed(ViEvac_PolarChart.ClsGroupLegendWrapper, true)
                        .attr(ViEvac_PolarChart.AttrTransform, translate(
                            idxLeg * oneLegendWidth, 0))

                    // add the legend label ...
                    groupLegendWrapper
                        .append(ViEvac_PolarChart.HtmlObjText)
                        .classed(ViEvac_PolarChart.ClsLegendLabel, true)
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("dy", labelHeight)
                        .text(this.chartData.dataPoints[0].values[2].measureName)
                        .style("text-anchor", ViEvac_PolarChart.ConstBegin)
                        .style("fill", this.settings.legend.fill)
                        .style("font-size", this.settings.legend.fontSize)
                        .style("font-family", this.settings.legend.fontFamily);

                    // okey ... we do need the data values - which we calculate by our private method
                    // before we need the label width ...
                    let nGroups = this.chartData.groups.length
                    let labelWidth = (oneLegendWidth - nGroups * dataCircleR * 2 - ViEvac_PolarChart.LegendAttrDistance) / nGroups

                    let legendData = this.getGroupLegendData(dataCircleR)

                    // we do need to plot it now. Starting with DOM things ...
                    let legendSelection: Selection<any> = groupLegendWrapper.selectAll("." + ViEvac_PolarChart.ClsLegend);
                    let legendSelectionData = legendSelection.data(legendData)
                    legendSelectionData
                        .exit()
                        .remove()

                    let legendSelectionEntered = legendSelectionData
                        .enter()
                        .append(ViEvac_PolarChart.HtmlObjG)

                    let legendSelectionMerged = legendSelectionEntered.merge(legendSelection);

                    // do the circles or labels first ...
                    if (this.settings.groups.useSymbols && this.chartData.groups.length <= 7) {

                    } else {
                        legendSelectionMerged
                            .append(ViEvac_PolarChart.HtmlObjCircle)
                            .attr('cx', (d, i) => (labelWidth * i + dataCircleR))
                            .attr('cy', dataCircleR + labelHeight + this.LegendLabelOffset)
                            .attr('r', dataCircleR)
                            .attr('fill', this.settings.impact.legendColor)
                            .style('stroke-width', this.settings.dataBasics.strokeWidth + "px")
                            .style('stroke', this.settings.dataBasics.stroke)
                    }

                    // add some text we do ...
                    legendSelectionMerged
                        .append(ViEvac_PolarChart.HtmlObjText)
                        .classed(ViEvac_PolarChart.ClsLegendLabel, true)
                        .attr("x", (d, i) => (labelWidth * i + dataCircleR))
                        .attr("y", dataCircleR + labelHeight + this.LegendLabelOffset)
                        .text(d => d.name)
                        .attr("dy", labelHeight / 2)
                        .style("text-anchor", ViEvac_PolarChart.ConstMiddle)
                        .style("fill", this.settings.legend.fill)
                        .style("font-size", this.settings.legend.fontSize)
                        .style("font-family", this.settings.legend.fontFamily);

                    // truncateTextIfNeeded(group, labelWidth)
// MUCH TO DO !


                    // and add the tooltip (this seems just to be how the library works ...)
                    this.tooltipServiceWrapper.addTooltip(
                        legendSelectionMerged,
                        (tooltipEvent: TooltipEventArgs<TooltipEnabledDataPoint>) => {
                            return tooltipEvent.data.tooltipInfo;
                        }
                    );
                }
            }

            // we want tooltips ...
            this.tooltipServiceWrapper.addTooltip(dataCirclesMerged, (tooltipEvent: TooltipEventArgs<TooltipEnabledDataPoint>) => {
                return tooltipEvent.data.tooltipInfo;
            });


            // remove after finish ...
            console.log("ChartData", this.chartData)
        } catch (ex) {
            console.log("EX", ex)
        }
    }

    /**
     * This is another awesome method too. It converts the settings into something actually usefull. Besides
     * necessary stuff it also checks for values not set and enters default stuff.
     * @param dataView 
     */
    private static parseSettings(dataView: DataView): Settings {
        let settings: Settings = Settings.parse(dataView) as Settings;

        // we care about the maximum number of data steps ...
        settings.innerCircle.innerOffset = Math.max(settings.innerCircle.innerOffset, 0)

        // we do some stuff to make sure the colorbrewing works for us ...
        if (!settings.dataAxis.enableColorbrewer) {
            // no brewer - we just need to check if the min/max is fullfilled
            settings.dataAxis.steps = Math.min(settings.dataAxis.steps, ViEvac_PolarChart.DataStepMaxLimit)
            settings.dataAxis.steps = Math.max(settings.dataAxis.steps, ViEvac_PolarChart.DataStepMinLimit)
        } else {
            // first see if there is a brewer selected ...
            if (settings.dataAxis.colorbrewer === "") {
                settings.dataAxis.colorbrewer = ViEvac_PolarChart.DefaultColorbrewer;
            }

            // see if the chosen brewer has enough colors. If not - restrict the maxBuckets to the brewers colors ...
            let colorbrewerArray: IColorArray = colorbrewer[settings.dataAxis.colorbrewer];
            let minStepNum: number = 0;
            let maxStepNum: number = 0;
            for (let stepIndex: number = ViEvac_PolarChart.DataStepMinLimit; stepIndex < ViEvac_PolarChart.DataStepMaxLimit; stepIndex++) {
                if (minStepNum === 0 && (colorbrewerArray as Object).hasOwnProperty(stepIndex.toString())) {
                    minStepNum = stepIndex;
                }
                if ((colorbrewerArray as Object).hasOwnProperty(stepIndex.toString())) {
                    maxStepNum = stepIndex;
                }
            }
            settings.dataAxis.steps = Math.min(settings.dataAxis.steps, maxStepNum)
            settings.dataAxis.steps = Math.max(settings.dataAxis.steps, minStepNum)
        }

        // care for the buckets (size of points) ...
        if (settings.impact.show) {
            settings.impact.buckets = Math.max(settings.impact.buckets, ViEvac_PolarChart.BucketCountMinLimit)
            settings.impact.buckets = Math.min(settings.impact.buckets, ViEvac_PolarChart.BucketCountMaxLimit)
        }

        // and we care for those settings that depend on measures ...
        let nMeasures = dataView.categorical.values.length / dataView.categorical.categories.length
        if (nMeasures < 3) { settings.preparedness.show = false }
        if (nMeasures < 2) { settings.impact.show = false }

        return settings
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
        const settings: Settings = this.dataView && this.settings
            || Settings.getDefault() as Settings;

        const instanceEnumeration: VisualObjectInstanceEnumeration =
            Settings.enumerateObjectInstances(settings, options);

        // if (options.objectName === ViEvac_PolarChart.GroupPropertyIdentifier.objectName) {
        //     this.enumerateColors(this.chartData.groups, instanceEnumeration);
        // }

        // return (instanceEnumeration as VisualObjectInstanceEnumerationObject).instances || [];
        return instanceEnumeration || [];
    }

    /**
     * Enumerates all the datapoints and outputs properties ...
     * @param groups 
     * @param instanceEnumeration 
     */
    // private enumerateColors(groups: string[], instanceEnumeration: VisualObjectInstanceEnumeration): void {
    //     if (groups && groups.length > 0) {
    //         // if there is more than one group we iterate it ...
    //         groups.forEach((group) => {
    //             // for the properties (Settings) we need a display name and the identity (bc. it is dynamically to be identified)
    //             const displayName: string = group.toString();
    //             const identity: ISelectionId = group.identity as ISelectionId;

    //             console.log("GROUP-KEY", identity.getKey())
    //             console.log("NORMAL", ColorHelper.normalizeSelector(identity.getSelector(), false))
    //             // debugger;

    //             this.addAnInstanceToEnumeration(instanceEnumeration, {
    //                 displayName,
    //                 objectName: ViEvac_PolarChart.GroupPropertyIdentifier.objectName.toString(),
    //                 // selector: ColorHelper.normalizeSelector(identity.getSelector(), false),
    //                 selector: group.groupId,
    //                 properties: {
    //                     fill: { solid: { color: group.color } }
    //                 }
    //             });
    //         });

    //         console.log("INSTANCE", instanceEnumeration)

    //     }
    // }

    /**
     * Adds an instance to the property enumeration
     * @param instanceEnumeration 
     * @param instance 
     */
    private addAnInstanceToEnumeration(
        instanceEnumeration: VisualObjectInstanceEnumeration,
        instance: VisualObjectInstance
    ): void {

        if ((instanceEnumeration as VisualObjectInstanceEnumerationObject).instances) {
            (instanceEnumeration as VisualObjectInstanceEnumerationObject)
                .instances
                .push(instance);
        } else {
            (instanceEnumeration as VisualObjectInstance[]).push(instance);
        }
    }

    private getColor(
        properties: DataViewObjectPropertyIdentifier,
        defaultColor: string,
        objects: DataViewObjects,
        measureKey: string
    ): string {

        const colorHelper: ColorHelper = new ColorHelper(
            this.colorPalette,
            properties,
            defaultColor
        );

        return colorHelper.getColorForSeriesValue(objects, measureKey, "foreground");
    }

    /**
    * Method to set the most important size variables of. A good one this is ...
    * @param viewport Viewport object to be used to calculate sizes
    */
    private setChartSizes(viewport: IViewport, chartData: ChartData): void {
        // we start with the viewport sizes ...
        this.chartSizes.vpHeight =
            viewport.height -
            this.margin.top -
            this.margin.bottom;

        this.chartSizes.vpWidth =
            viewport.width -
            this.margin.left -
            this.margin.right;

        // we now calculate the size and position of the main (polar) chart ...
        this.chartSizes.axisLabelHeight = getCategoryAxisHeight(chartData, this.settings)
        this.chartSizes.radarR = Math.floor((Math.min(this.chartSizes.vpHeight, this.chartSizes.vpWidth) - 2 * this.chartSizes.axisLabelHeight - this.CategoryLabelOffset) / 2) - 1

        // calculate the legend and subtract it from the R (but only if we are broader than high ...)
        this.chartSizes.legendHeight = this.getLegendHeight(chartData)
        this.chartSizes.radarR += Math.max(Math.min(0, this.chartSizes.vpHeight - this.chartSizes.vpWidth - this.chartSizes.legendHeight), -this.chartSizes.legendHeight) / 2

        this.chartSizes.radarCX = (this.chartSizes.vpWidth / 2)
        this.chartSizes.radarCY = ((this.chartSizes.vpHeight - this.chartSizes.legendHeight) / 2)
        this.chartSizes.angleOffSet = this.settings.categoryAxis.angleOffSet
    }

    /**
     * Returns the dataScale 
     */
    private getDataScale(chartData: ChartData) {
        let inputMin: number = this.settings.dataAxis.minValue
        let inputMax: number = this.settings.dataAxis.maxValue
        let outputMin: number = this.settings.innerCircle.innerOffset
        let outputMax: number = this.chartSizes.radarR

        // we first need to set min and max values for the axis ...
        if (chartData.dataPoints && !(this.settings.dataAxis.maxValue > this.settings.dataAxis.minValue)) {
            inputMin = d3.min(chartData.dataPoints, function (d: DataPoint) {
                return Number(d.values[0].measureValue);
            });
            inputMax = d3.max(chartData.dataPoints, function (d: DataPoint) {
                return Number(d.values[0].measureValue);
            });
        }

        // we also limit the inner offset to a factor set hardcoded by default (half of total size) ...
        outputMin = Math.min(
            this.settings.innerCircle.innerOffset,
            this.chartSizes.radarR * ViEvac_PolarChart.innerOffsetLimitFactor
        )

        // calculate the axis depending on the mode (ONLY LINEAR ATM) ...
        if (false) {
            // placeholder for other modes ...
        } else {
            // linear mode is default and don't forget to invert ...
            return d3.scaleLinear()
                .domain([inputMin, inputMax])
                .range((this.settings.dataAxis.invert) ? [outputMax, outputMin] : [outputMin, outputMax])
                .clamp(this.settings.dataAxis.clamp);
        }
    }

    /**
     * Function to calculate the scale for the point radius
     * @param chartData All data - used to look for max and min values
     * @param settings The settings used to see if custom scales are set
     */
    private getImpactScale(chartData: ChartData, settings: Settings): any {
        let inputMin: number = null
        let inputMax: number = null

        // we first set the input to the data intervall ..
        if (chartData.dataPoints) {
            inputMin = d3.min(chartData.dataPoints, function (d: DataPoint) {
                return Number(d.values[1].measureValue);
            });
            inputMax = d3.max(chartData.dataPoints, function (d: DataPoint) {
                return Number(d.values[1].measureValue);
            });
        }

        // now we override it, but only if valid settings are given ...
        if (settings.impact.maxValue > 0 && settings.impact.maxValue > settings.impact.minValue) {
            inputMin = !(this.settings.impact.minValue == null) ? settings.impact.minValue : inputMin
            inputMax = settings.impact.maxValue
        }

        if (settings.impact.bucketScale) {
            // now let's output the scale; we calculate quantiles and do a quantile scale, matching the number of color buckets ...
            let intervals = getRangePoints(0, 1, settings.impact.buckets)
            return d3.scaleQuantile()
                .domain([inputMin, inputMax])
                .range(intervals)
        } else {
            // in this case we want a linear scale ...
            return d3.scaleLinear()
                .domain([inputMin, inputMax])
                .range([0, 1])
                .clamp(settings.impact.clamp);
        }
    }

    /**
     * Function to get the color scale ...
     * @param chartData 
     * @param settings 
     * @param options 
     */
    private getPreparednessScale(chartData: ChartData, settings: Settings): any {

        let inputMin: number = null
        let inputMax: number = null

        // we first set the input to the data intervall ..
        if (chartData.dataPoints) {
            inputMin = d3.min(chartData.dataPoints, function (d: DataPoint) {
                return Number(d.values[2].measureValue);
            });
            inputMax = d3.max(chartData.dataPoints, function (d: DataPoint) {
                return Number(d.values[2].measureValue);
            });
        }

        // now we override it, but only if valid settings are given ...
        if (settings.preparedness.maxValue > 0 && settings.preparedness.maxValue > settings.preparedness.minValue) {
            inputMin = !(this.settings.preparedness.minValue == null) ? settings.preparedness.minValue : inputMin
            inputMax = settings.preparedness.maxValue
        }

        // we need a color scale ...
        let bgSegmentColorAxis = getColorScale({
            inputMin: inputMin,
            inputMax: inputMax,
            steps: this.settings.preparedness.buckets,
            usebrewer: this.settings.preparedness.enableColorbrewer,
            brewer: this.settings.preparedness.colorbrewer,
            gradientStart: this.settings.preparedness.gradientStart,
            gradientEnd: this.settings.preparedness.gradientEnd
        })

        return bgSegmentColorAxis
    }


    private setFilter(id) {
        let filter = this.mainChart.append('defs').append('filter').attr('id', id)
        let feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur')
        let feMerge = filter.append('feMerge')
        let feMergeNode_1 = feMerge.append('feMergeNode').attr('in', 'coloredBlur')
        let feMergeNode_2 = feMerge.append('feMergeNode').attr('in', 'SourceGraphic')
    }

    /**
     * function to calculate the legend height
     * @param text 
     * @param dataCircleR 
     * @param settings 
     * @param offSet 
     */
    private getLegendHeight(chartData: ChartData): number {

        // if the legend is turned off, we return 0
        if (!this.settings.legend.show) { return 0 }

        let text: powerbi.PrimitiveValue = _.maxBy([chartData.dataPoints[0].values[0].measureName, chartData.dataPoints[0].values[0].measureName], "length") || "";


        // now we need four things: legend Text height (2 times), dataPoint size and offset
        let labelHeight = TextMeasurementService.measureSvgTextHeight({
            fontSize: PixelConverter.toString(this.settings.legend.fontSize),
            text: text.toString().trim(),
            fontFamily: this.settings.legend.fontFamily
        })

        // we do need to do this the hard way to avoid a loop in the logic (sizing the radar by the size of points that are sized by the radar)
        // to avoid this we assume maximum size possible (which costs us space ...) at least in dynamic mode ...
        let dataFieldAngle = Math.max(360 / chartData.uniqueCategories.length, ViEvac_PolarChart.maxDataFieldAngle)
        let dataCircleR = this.chartSizes.radarR / 2 * dataFieldAngle / 2 * Math.PI / 180 -
            this.settings.impact.minPointRadius

        if (this.settings.dataBasics.useFixedRadius) {
            dataCircleR = Math.min(this.settings.dataBasics.scaleFactor, dataCircleR)
        }

        // we now return the size (in pixels) d3 needs for this ...
        return labelHeight * 2 + (2 * dataCircleR) + this.LegendLabelOffset * 2
    }

    private getImpactLegendData(impactScale: any): any {
        // we first need input min and max ...
        let inputMin: number = null
        let inputMax: number = null

        // we first set the input to the data intervall ..
        if (this.chartData.dataPoints) {
            inputMin = d3.min(this.chartData.dataPoints, function (d: DataPoint) {
                return Number(d.values[1].measureValue);
            });
            inputMax = d3.max(this.chartData.dataPoints, function (d: DataPoint) {
                return Number(d.values[1].measureValue);
            });
        }

        // now we override it, but only if valid settings are given ...
        if (this.settings.impact.maxValue > 0 && this.settings.impact.maxValue > this.settings.impact.minValue) {
            inputMin = !(this.settings.impact.minValue == null) ? this.settings.impact.minValue : inputMin
            inputMax = this.settings.impact.maxValue
        }

        // now we create the legend values ... 
        // create a datavalues array and then do a tooltip ready dictionary ...
        let legendDataValues: number[] = []
        if (this.settings.impact.bucketScale) {
            // we do get quantiles ...
            legendDataValues = [inputMin].concat(impactScale.quantiles());
        } else {
            // or values from a linear thingie ...
            legendDataValues = getRangePoints(inputMin, inputMax, this.settings.impact.buckets + 1)
            legendDataValues.splice(-1, 1)
        }

        // map the value and the tooltipInfo ...
        let legendData = legendDataValues.map((value, index) => {
            return {
                value: value,
                tooltipInfo: [{
                    displayName: `Min value`,
                    value: value && typeof value.toFixed === "function" ? value.toFixed(2) : this.chartData.categoryValueFormatter.format(value)
                },
                {
                    displayName: `Max value`,
                    value: legendDataValues[index + 1] && typeof legendDataValues[index + 1].toFixed === "function" ? legendDataValues[index + 1].toFixed(2) : this.chartData.categoryValueFormatter.format(inputMax)
                }]
            };
        });

        // return it we do ...
        return legendData
    }

    private getGroupLegendData(dataCircleR: number): GroupLabelData[] {
        // so we need to check how many groups there are and get their names and symbols ...
        let groupLegendData: GroupLabelData[] = []
        this.chartData.groups.forEach((group, i) => {
            // start by doing the symbol ...
            var symbolGenerator = d3.symbol()
            symbolGenerator
                .type(d3[ViEvac_PolarChart.d3Symbols[i]])
                .size(ViEvac_PolarChart.symbolCorrectionFactor * Math.pow(dataCircleR, 2))

            // and do it ...
            groupLegendData.push({
                idx: i,
                name: group,
                symbol: symbolGenerator
            })
        })
        return groupLegendData
    }
}
