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
import IViewport = powerbi.IViewport;

import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumeration = powerbi.VisualObjectInstanceEnumeration;

// ------------------------------ POWERBI LIBRARIES ----------------------------------
import {
    TooltipEventArgs,
    ITooltipServiceWrapper,
    TooltipEnabledDataPoint,
    createTooltipServiceWrapper
} from "powerbi-visuals-utils-tooltiputils";
import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";
import { valueFormatter, textMeasurementService } from "powerbi-visuals-utils-formattingutils";
// import { createLinearColorScale, LinearColorScale, ColorHelper } from "powerbi-visuals-utils-colorutils";
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
    IMargin, ChartSizes, ChartData, DataPoint, BgSegment, IColorArray, IColorBrewerSettings
} from "./dataInterfaces";

import {
    getCategoryAxisHeight,
    getCartFromPolar,
    getTextSize,
    getColorScale
} from "./utilities";
import { text } from "d3";
import { numberFormat } from "powerbi-visuals-utils-formattingutils/lib/src/formattingService/formattingService";


export class ViEvac_PolarChart implements IVisual {
    // ----------------------------- NECESSARY BASICS ------------------------------------
    private host: IVisualHost;

    private svg: Selection<any>;
    private div: Selection<any>;
    private mainChart: Selection<any>;
    private dataView: DataView;
    private viewport: IViewport;

    private target: HTMLElement;
    private updateCount: number;
    private settings: Settings;
    private textNode: Text;
    private element: HTMLElement;

    private tooltipServiceWrapper: ITooltipServiceWrapper;

    // ----------------------------- BASIC SETTINGS --------------------------------------
    private margin: IMargin = { left: 5, right: 5, bottom: 5, top: 5 };
    private chartSizes: ChartSizes = { vpHeight: 0, vpWidth: 0, radarR: 0, radarCX: 0, radarCY: 0, axisLabelHeight: 0, angleOffSet: -90 };

    private static animationDuration: number = 1000;
    private static DataStepMaxLimit: number = 10;
    private static DataStepMinLimit: number = 1;
    private static DefaultColorbrewer: string = "Reds";
    private static innerOffsetLimitFactor: number = 0.5;

    private static LabelOffsetDX: number = 2;
    private static LabelOffsetDY: number = 2;

    private CategoryLabelOffset: number = 5;

    // ----------------------------- USELESS CONSTANTS  ----------------------------------
    private static AttrX: string = "x";
    private static AttrY: string = "y";
    private static AttrCX: string = "cx";
    private static AttrCY: string = "cy";
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


    // ------------------------------------ CLASSES  -------------------------------------
    private static ClsAll: string = "*";
    private static ClsDivChart: string = "divViEvac_PolarChart"
    private static ClsSvgChart: string = "svgViEvac_PolarChart"
    private static ClsMainChart: string = "ViEveac_mainChart"
    private static ClsAxisWrapper: string = "DataAxisWrapper"
    private static ClsAxisLevels: string = "DataAxisLevels"
    private static ClsAxisLabels: string = "DataAxisLabels"
    private static ClsCategoryAxisLines: string = "CategoryAxisLines"
    private static ClsCategoryAxisSegments: string = "CategoryAxisSegments"
    private static ClsCategoryAxisLabels: string = "CategoryAxisLabels"
    private static ClsCategoryAxisLabelTexts: string = "CategoryAxisLabelText"
    private static ClsCategorySegment: string = "CatSegment_"
    private static ClsDataRing: string = "DataRing_"
    private static ClsDataCircles: string = "DataPoint"

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

        // We create the formatter that helps us then to output the correct types and format ...
        categoryValueFormatter = valueFormatter.create({
            format: valueFormatter.getFormatStringByColumn(dataView.categorical.categories[0].source),
            value: dataView.categorical.categories[0].values[0]
        });

        valuesFormatter = valueFormatter.create({
            format: valueFormatter.getFormatStringByColumn(dataView.categorical.values[0].source),
            value: dataView.categorical.values[0].values[0]

        });

        // and now we get the stuff done ... 
        dataView.categorical.categories[0].values.forEach((category, index) => {
            // now cycle through every group (group) within the category
            dataView.categorical.values.forEach((groupArray) => {
                // get the formatting (why ever) ...
                let groupFormatter = valueFormatter.create({
                    format: groupArray.source.format,
                    value: dataView.categorical.values[0].values[0]
                });

                // now - more interesting - get the group and values. Let's push 'em to data points ...
                // we also need to check for a second category value and add it if it is given ...
                let value = groupArray.values[index];
                let categorySecondField = ""
                let tooltipArray = []

                if (dataView.categorical.categories.length == 2) {
                    categorySecondField = dataView.categorical.categories[1].values[index].toString()
                    tooltipArray = [{
                        displayName: `Category`,
                        value: (category || "").toString()
                    },
                    {
                        displayName: "Field",
                        value: (categorySecondField || "").toString()
                    },
                    {
                        displayName: `Group`,
                        value: (groupArray.source.groupName || "").toString()
                    },
                    {
                        displayName: `Value`,
                        value: valuesFormatter.format(value)
                    }]
                } else {
                    // only one category field ...
                    categorySecondField = ""
                    tooltipArray = [{
                        displayName: `Category`,
                        value: (category || "").toString()
                    },
                    {
                        displayName: `Group`,
                        value: (groupArray.source.groupName || "").toString()
                    },
                    {
                        displayName: `Value`,
                        value: valuesFormatter.format(value)
                    }]
                }

                dataPoints.push({
                    group: {
                        group: groupArray.source.groupName,
                        category: category,
                        groupId: groupArray.source.groupName + "-" + category
                    },
                    category: category,
                    categorySecondField: categorySecondField,
                    value: value,
                    valueStr: groupFormatter.format(value),
                    tooltipInfo: tooltipArray
                });
            });
        });

        // create the data and return it ...
        dataPoints = dataPoints.sort(function (a, b) {
            // we sort the dataPoints by the Y group values
            var CatA = a.category.toString().toUpperCase();
            var CatB = b.category.toString().toUpperCase();
            return CatA < CatB ? -1 : CatA > CatB ? 1 : 0;
        })

        var groups = dataPoints.map(v => v.group.group).filter((value, index, self) => {
            return self.indexOf(value) === index;
        })

        var categories = dataPoints.map(v => v.category).filter((value, index, self) => {
            return self.indexOf(value) === index;
        })

        var categoryFields = dataPoints.map(v => v.categorySecondField).filter((value, index, self) => {
            return self.indexOf(value) === index;
        })

        // and return it we do ...
        return <ChartData>{
            dataPoints: dataPoints,
            categories: categories,
            categoryFields: categoryFields,
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
            let chartData: ChartData = this.converter(dataView);

            // set size variables within the class for further use  ...
            this.setChartSizes(options.viewport, chartData)

            // also prepare some necessary variables for further use ...
            let angleOffSet = this.settings.categoryAxis.angleOffSet
            let dataPointAngle = 360 / chartData.dataPoints.length
            let DataAxisMinValue = this.settings.dataAxis.minValue
            let DataAxisMaxValue = this.settings.dataAxis.maxValue
            let steps = this.settings.dataAxis.steps

            // we need to set min and max values if needed ...
            if (chartData.dataPoints && !(this.settings.dataAxis.maxValue > this.settings.dataAxis.minValue)) {
                DataAxisMinValue = d3.min(chartData.dataPoints, function (d: DataPoint) {
                    return d.value as number;
                });
                DataAxisMaxValue = d3.max(chartData.dataPoints, function (d: DataPoint) {
                    return d.value as number;
                });
            }

            // a few data related variables ...
            let categorySizes = chartData.categories.map(value => {
                let lastIdx = (chartData.dataPoints.map(v => v.category).lastIndexOf(value))
                let firstIdx = (chartData.dataPoints.map(v => v.category).indexOf(value))
                return {
                    category: value,
                    size: (lastIdx - firstIdx + 1),
                    startIndex: firstIdx,
                    lastIndex: lastIdx
                }
            })


            // and also a scale ...
            var dataScale = this.getDataScale(chartData)

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
                let bgSegments: BgSegment[] = [];
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
                                startAngle: (category.startIndex * dataPointAngle + angleOffSet + 90) * Math.PI / 180,
                                endAngle: ((category.lastIndex + 1) * dataPointAngle + angleOffSet + 90) * Math.PI / 180,
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
                        let clsSegment: string = ViEvac_PolarChart.ClsCategorySegment + d.category
                        let clsRing: string = ViEvac_PolarChart.ClsDataRing + d.innerRadius.toString()
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
                // we do need to distinguish if we have a two-dimensional category set
                if (chartData.categoryFields.length == 0) {
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
                    let textOrientation = "2%"
                    if (this.settings.categoryAxisLabels.orientation == "middle") {
                        textOrientation = "50%"
                    } else if (this.settings.categoryAxisLabels.orientation == "end") {
                        textOrientation = "98%"
                    }

                    // we create the arcs for the labels. As we want to be able to center the text this is going to be tricky
                    // and done with cut arc paths by regular expressions ...
                    let chartDY = this.chartSizes.axisLabelHeight

                    axisWrapper.selectAll(ViEvac_PolarChart.ClsCategoryAxisLabelTexts)
                        .data(categorySizes)
                        .enter().append(ViEvac_PolarChart.HtmlObjText)
                        .classed(ViEvac_PolarChart.ClsCategoryAxisLabelTexts, true)
                        .attr(ViEvac_PolarChart.AttrDY, function (d) {
                            let lastAngle = ((d.lastIndex + 1) * dataPointAngle + angleOffSet) * Math.PI / 180
                            return (Math.sin(lastAngle) > 0) ? -chartDY / 2 : chartDY
                        })
                        .append(ViEvac_PolarChart.HtmlTextPath)
                        .attr("startOffset", textOrientation)
                        .attr(ViEvac_PolarChart.HtmlPathLink, function (d, i) {
                            // link to the ID of the path ...
                            return "#" + ViEvac_PolarChart.ClsCategoryAxisLabels + i
                        })
                        .text(function (d) { return d.category.toString() })
                        .attr(ViEvac_PolarChart.StFill, this.settings.categoryAxisLabels.color)
                        .style(ViEvac_PolarChart.StTextAnchor, this.settings.categoryAxisLabels.orientation)
                        .style(ViEvac_PolarChart.StFontSize, this.settings.categoryAxisLabels.fontSize)
                        .style(ViEvac_PolarChart.StFontFamily, this.settings.categoryAxisLabels.fontFamily)
                }
            }

            // ---------------------------------------------------------------------------------
            // finally we plot the data. This should be easy compared to what we've been through
            // ---------------------------------------------------------------------------------

            // we do need a scale for the data ... TODO !
            // we calculate the radius of half the radar and scale it with our overlapping factor to get data size
            let radarHalfR = dataScale((DataAxisMaxValue - DataAxisMinValue) / 2 + DataAxisMinValue)
            let dataCircleR = radarHalfR * this.settings.dataPoint.scaleFactor * dataPointAngle * Math.PI / 180

            // create some container and data things and remove DOM (whatever ...)
            let dataCircles: Selection<DataPoint> = this.mainChart.selectAll("." + ViEvac_PolarChart.ClsDataCircles)
            let dataCirclesData = dataCircles.data(chartData.dataPoints);
            let dataCirclesEntered = dataCirclesData
                .enter()
                .append(ViEvac_PolarChart.HtmlObjCircle)
            let dataCirclesMerged = dataCirclesEntered.merge(dataCircles)


            // now we simply draw our data points (as easy as that) ...
            dataCirclesMerged
                .attr('cx', function (d, i) {
                    console.log("PARAMETERS", dataScale(Number(d.value)) + " - " + (i + 0.5) * dataPointAngle + " - " + angleOffSet)
                    console.log("RESULT", getCartFromPolar(dataScale(Number(d.value)), (i + 0.5) * dataPointAngle, angleOffSet).x)

                    return getCartFromPolar(dataScale(Number(d.value)), (i + 0.5) * dataPointAngle, angleOffSet).x
                })
                .attr('cy', function (d, i) {
                    return getCartFromPolar(dataScale(Number(d.value)), (i + 0.5) * dataPointAngle, angleOffSet).y
                })
                .attr('r', dataCircleR)
                .attr('fill', this.settings.dataPoint.group1color)
                .style('stroke-width', this.settings.dataPoint.strokeWidth)
                .style('stroke', this.settings.dataPoint.stroke)
                .classed(ViEvac_PolarChart.ClsDataCircles, true)
            // .attr("class", function (d) {
            //     return PB_BubbleMatrix.ClsXId + xScale(d.categoryX.toString()) + " " +
            //         PB_BubbleMatrix.ClsYId + yScale(d.categoryY.groupedId.toString())
            // })


            // remove after finish ...
            console.log("ChartData", chartData)
        } catch (ex) {

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
        settings.dataAxis.steps = Math.min(settings.dataAxis.steps, ViEvac_PolarChart.DataStepMaxLimit)
        settings.dataAxis.steps = Math.max(settings.dataAxis.steps, ViEvac_PolarChart.DataStepMinLimit)
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

        return instanceEnumeration || [];
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
        this.chartSizes.radarCX = (this.chartSizes.vpWidth / 2)
        this.chartSizes.radarCY = (this.chartSizes.vpHeight / 2)
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
                return d.value as number;
            });
            inputMax = d3.max(chartData.dataPoints, function (d: DataPoint) {
                return d.value as number;
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

    private setFilter(id) {
        let filter = this.mainChart.append('defs').append('filter').attr('id', id)
        let feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur')
        let feMerge = filter.append('feMerge')
        let feMergeNode_1 = feMerge.append('feMergeNode').attr('in', 'coloredBlur')
        let feMergeNode_2 = feMerge.append('feMergeNode').attr('in', 'SourceGraphic')
    }
}