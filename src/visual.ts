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
import IValueFormatter = valueFormatter.IValueFormatter;
import ValueFormatter = valueFormatter.valueFormatter;

import { manipulation } from "powerbi-visuals-utils-svgutils";
import translate = manipulation.translate;

import * as d3 from "d3";

// ---------------------------- A FEW D3 DEFINITIONS ---------------------------------
type Selection<T> = d3.Selection<any, T, any, any>;
type D3Element =
    Selection<any>;

// ------------------------------ SETTINGS AND STUFF ---------------------------------
import {
    Settings
} from "./settings";

import {
    IMargin, ChartSizes, ChartData, DataPoint
} from "./dataInterfaces";

import {
    getCategoryAxisHeight,
    getCartFromPolar,
    getTextSize
} from "./utilities";
import { text } from "d3";


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
    private static innerOffsetLimitFactor: number = 0.5;

    // ----------------------------- USELESS CONSTANTS  ----------------------------------
    private static AttrX: string = "x";
    private static AttrY: string = "y";
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
    private static StTextAnchor: string = "text-anchor";
    private static StFontSize: string = "font-size";
    private static StFontFamily: string = "font-family";
    private static StFill: string = "fill";
    private static StOpacity: string = "opacity";

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
        let categoryValueFormatter: IValueFormatter;
        let valueFormatter: IValueFormatter;
        let dataPoints: DataPoint[] = [];

        // We create the formatter that helps us then to output the correct types and format ...
        categoryValueFormatter = ValueFormatter.create({
            format: ValueFormatter.getFormatStringByColumn(dataView.categorical.categories[0].source),
            value: dataView.categorical.categories[0].values[0]
        });

        valueFormatter = ValueFormatter.create({
            format: ValueFormatter.getFormatStringByColumn(dataView.categorical.values[0].source),
            value: dataView.categorical.values[0].values[0]

        });

        // and now we get the stuff done ... 
        dataView.categorical.categories[0].values.forEach((category, index) => {
            // now cycle through every group (group) within the category
            dataView.categorical.values.forEach((groupArray) => {
                // get the formatting (why ever) ...
                let groupFormatter = ValueFormatter.create({
                    format: groupArray.source.format,
                    value: dataView.categorical.values[0].values[0]
                });

                // now - more interesting - get the group and values. Let's push 'em to data points ...
                let value = groupArray.values[index];
                dataPoints.push({
                    group: {
                        group: groupArray.source.groupName,
                        category: category,
                        groupId: groupArray.source.groupName + "-" + category
                    },
                    category: category,
                    value: value,
                    valueStr: groupFormatter.format(value),
                    tooltipInfo: [{
                        displayName: `Category`,
                        value: (category || "").toString()
                    },
                    {
                        displayName: `Group`,
                        value: (groupArray.source.groupName || "").toString()
                    },
                    {
                        displayName: `Value`,
                        value: groupFormatter.format(value)
                    }]
                });
            });
        });

        // create the data and return it ...
        dataPoints = dataPoints.sort(function (a, b) {
            // we sort the dataPoints by the Y group values
            var GroupA = a.group.groupId.toString().toUpperCase();
            var GroupB = b.group.groupId.toString().toUpperCase();
            return GroupA < GroupB ? -1 : GroupA > GroupB ? 1 : 0;
        })

        var groups = dataPoints.map(v => v.group).filter((value, index, self) => {
            return self.map(v => v.groupId).indexOf(value.groupId) === index;
        })

        var categories = dataPoints.map(v => v.category).filter((value, index, self) => {
            return self.indexOf(value) === index;
        })

        // and return it we do ...
        return <ChartData>{
            dataPoints: dataPoints,
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

            // set size variables within the class for further use ...
            this.setChartSizes(options.viewport, chartData)

            // and append the main chart as group ...
            this.mainChart = this.svg.append(ViEvac_PolarChart.HtmlObjG)
                .classed(ViEvac_PolarChart.ClsMainChart, true)
                .attr(ViEvac_PolarChart.AttrTransform, translate(this.chartSizes.radarCX, this.chartSizes.radarCY))

            // next we do care about the background, which means circles ftw ...
            // we first need to set min and max values for the axis ...
            if (chartData.dataPoints && !(this.settings.dataAxis.maxValue > this.settings.dataAxis.minValue)) {
                this.settings.dataAxis.minValue = d3.min(chartData.dataPoints, function (d: DataPoint) {
                    return d.value as number;
                });
                this.settings.dataAxis.maxValue = d3.max(chartData.dataPoints, function (d: DataPoint) {
                    return d.value as number;
                });
            }
            // we need the dataScale and set some settings too ...
            var dataScale = this.getDataScale(chartData)
            let DataAxisMinValue = this.settings.dataAxis.minValue
            let DataAxisMaxValue = this.settings.dataAxis.maxValue
            let steps = this.settings.dataAxis.steps

            // let's get to the middle of it, won't we? Start by removing and then drawing the axis wrapper group agian ...
            d3.select("." + ViEvac_PolarChart.ClsAxisWrapper).remove()
            let axisWrapper = this.mainChart
                .append(ViEvac_PolarChart.HtmlObjG)
                .classed(ViEvac_PolarChart.ClsAxisWrapper, true)

            // Filter for the outside glow ...
            if (this.settings.dataAxis.showFilter) {
                this.setFilter('glow')
            }

            axisWrapper.selectAll(ViEvac_PolarChart.ClsAxisLevels)
                .data(d3.range(0, this.settings.dataAxis.steps + 1).reverse())
                .enter()
                .append(ViEvac_PolarChart.HtmlObjCircle)
                .classed(ViEvac_PolarChart.ClsAxisLevels, true)
                .attr("r", function (d, i) {
                    console.log("data", dataScale((DataAxisMaxValue - DataAxisMinValue) / steps * d))
                    return dataScale((DataAxisMaxValue - DataAxisMinValue) / steps * d);
                })
                .style(ViEvac_PolarChart.StFill, this.settings.dataAxis.fillColor)
                .style("stroke", this.settings.dataAxis.stroke)
                .style("stroke-width", this.settings.dataAxis.strokeWidth)
                .style("filter", (this.settings.dataAxis.showFilter) ? "url(#glow)" : "")

            // we are doing the labels for the axis now ...
            let angleOffSet = this.settings.categoryAxis.angleOffSet
            let fontSize = this.settings.dataAxisLabels.fontSize
            let fontFamily = this.settings.dataAxisLabels.fontFamily

            if (this.settings.dataAxisLabels.show) {
                axisWrapper.selectAll(ViEvac_PolarChart.ClsAxisLabels)
                    .data(d3.range(1, this.settings.dataAxis.steps + 1).reverse())
                    .enter()
                    .append(ViEvac_PolarChart.HtmlObjText)
                    .classed(ViEvac_PolarChart.ClsAxisLabels, true)
                    .attr(ViEvac_PolarChart.AttrX, function (d, i) {
                        return getCartFromPolar(
                            dataScale((DataAxisMaxValue - DataAxisMinValue) / steps * d),
                            0,
                            angleOffSet
                        ).x
                    })
                    .attr(ViEvac_PolarChart.AttrY, function (d, i) {
                        return getCartFromPolar(
                            dataScale((DataAxisMaxValue - DataAxisMinValue) / steps * d),
                            0,
                            angleOffSet
                        ).y
                    })
                    .attr(ViEvac_PolarChart.StFill, this.settings.dataAxisLabels.color)
                    .style(ViEvac_PolarChart.StFontSize, fontSize)
                    .style(ViEvac_PolarChart.StFontFamily, fontFamily)
                    .style(ViEvac_PolarChart.StTextAnchor, (Math.abs(Math.cos(angleOffSet * Math.PI / 180)) < 0) ? ViEvac_PolarChart.ConstStart : ViEvac_PolarChart.ConstEnd)
                    .text(function (d, i) {
                        return (DataAxisMaxValue - DataAxisMinValue) / steps * d
                    })
                    .attr(ViEvac_PolarChart.AttrDY, function (d, i) {
                        // calculate the text size and then (depending on the offset angle position the thing ...)
                        let textSize = getTextSize(
                            ((DataAxisMaxValue - DataAxisMinValue) / steps * d).toString(),
                            fontSize,
                            fontFamily
                        )
                        return Math.sin(angleOffSet * Math.PI / 180) * -(textSize.height) +
                            Math.cos(angleOffSet * Math.PI / 180) * -(textSize.width)
                    })

                console.log(axisWrapper.selectAll(ViEvac_PolarChart.ClsAxisLabels))
            }

            // // this is simply for testing ...
            // this.mainChart.append('circle')
            //     .attr('cx', this.chartSizes.radarCX)
            //     .attr('cy', this.chartSizes.radarCy)
            //     .attr('r', this.chartSizes.radarR)
            //     .attr('stroke', 'black')
            //     .attr('fill', '#CCC');
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
        settings.dataAxis.innerOffset = Math.max(settings.dataAxis.innerOffset, 0)

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
        this.chartSizes.radarR = Math.floor((Math.min(this.chartSizes.vpHeight, this.chartSizes.vpWidth) - 2 * this.chartSizes.axisLabelHeight) / 2) - 1
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
        let outputMin: number = this.settings.dataAxis.innerOffset
        let outputMax: number = this.chartSizes.radarR

        // we also limit the inner offset to a factor set hardcoded by default (half of total size) ...
        outputMin = Math.min(
            this.settings.dataAxis.innerOffset,
            this.chartSizes.radarR * ViEvac_PolarChart.innerOffsetLimitFactor
        )

        // calculate the axis depending on the mode (ONLY LINEAR ATM) ...
        if (false) {
            // placeholder for other modes ...
        } else {
            // linear mode is default
            return d3.scaleLinear()
                .domain([inputMin, inputMax])
                .range([outputMin, outputMax])
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