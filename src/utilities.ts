/*
 *  Power BI Visualizations
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

import powerbi from "powerbi-visuals-api";
import IViewport = powerbi.IViewport;


import * as _ from "lodash-es";
import * as d3 from "d3";


import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";
import { valueFormatter, textMeasurementService } from "powerbi-visuals-utils-formattingutils";
import { createLinearColorScale, LinearColorScale, ColorHelper } from "powerbi-visuals-utils-colorutils";

import { axis } from "powerbi-visuals-utils-chartutils";
import LabelLayoutStrategy = axis.LabelLayoutStrategy;


import TextMeasurementService = textMeasurementService.textMeasurementService;

import DataViewObjects = powerbi.DataViewObjects;
import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;

import ISelectionId = powerbi.extensibility.ISelectionId;
import ISelectionIdVisual = powerbi.extensibility.ISelectionId;

import {
    ChartData,
    DataPoint,
    ChartSizes,
    IColorBrewerSettings,
    IColorArray
} from "./dataInterfaces";

import {
    Settings,
    DataAxisSettings,
    colorbrewer
} from "./settings";
import { color } from "d3";
import { ViEvac_PolarChart } from "./visual";

// ---------------------------- A FEW D3 DEFINITIONS ---------------------------------
type Selection<T> = d3.Selection<any, T, any, any>;
type D3Element =
    Selection<any>;

/**
 * Gets the height of a text field to calculate space needed for axis ...
 * @param chartData 
 */
export function getCategoryAxisHeight(chartData: ChartData, settings: Settings): number {

    // if the axis are turned off, we return 0
    if (!settings.categoryAxisLabels.show) { return 0 }

    // first we see what the longest text value is (in characters)... 
    let maxLengthText: powerbi.PrimitiveValue = _.maxBy(chartData.groups.map(String), "length") || "";

    // we now return the size (in pixels) d3 needs for this ...
    return TextMeasurementService.measureSvgTextHeight({
        fontSize: PixelConverter.toString(settings.categoryAxisLabels.fontSize),
        text: maxLengthText.toString().trim(),
        fontFamily: settings.categoryAxisLabels.fontFamily
    });
}

/**
 * Function that converts a polar coordinate input (radius and angle) to cartesian coordinates
 * @param radius Radius of polar coordinates
 * @param phi Angle of polar coordinates (in degree !)
 * @param options Options array from the visual which includes the offset parameters for the radar
 */
export function getCartFromPolar(radius: number, angle: number, angleOffSet: number) {
    let phi = (angle + angleOffSet) * Math.PI / 180
    return {
        x: radius * Math.cos(phi),
        y: radius * Math.sin(phi)
    }
}

/**
 * Function that outpus the width and height of a text element
 * @param chartData 
 */
export function getTextSize(text: string[], fontsize: number, fontFamily: string) {
    // first we need the longest text of all ...
    let maxLengthText: powerbi.PrimitiveValue = _.maxBy(text, "length") || "";

    let width = TextMeasurementService.measureSvgTextWidth({
        fontSize: fontsize.toString(),
        fontFamily: fontFamily,
        text: maxLengthText
    })

    let height = TextMeasurementService.measureSvgTextHeight({
        fontSize: fontsize.toString(),
        fontFamily: fontFamily,
        text: maxLengthText
    })

    return { width: width, height: height }
}

/**
 * Function to calculate a color scale for a brewer ...
 * @param brewerSettings 
 */
export function getColorScale(brewerSettings: IColorBrewerSettings): any {
    // first set defaults ...
    let inputMin = (brewerSettings.inputMin == null) ? 0 : brewerSettings.inputMin
    let inputMax = (brewerSettings.inputMax == null) ? 1 : brewerSettings.inputMax
    let steps = (brewerSettings.steps == null) ? 4 : brewerSettings.steps
    let brewer = (brewerSettings.brewer == null) ? "Reds" : brewerSettings.brewer
    let gradientStart = (brewerSettings.gradientStart == null) ? "black" : brewerSettings.gradientStart
    let gradientEnd = (brewerSettings.gradientEnd == null) ? "white" : brewerSettings.gradientEnd

    // now care about the scale (brewing or not) ...
    let colors: Array<string>
    if (brewerSettings.usebrewer) {
        // we have a brewer ... use it ...
        let currentBrewer: IColorArray = colorbrewer[brewer]
        colors = (currentBrewer) ? currentBrewer[steps] : colorbrewer.Reds[steps]
    } else {
        // no brewer ... do the gradients ...
        let colorScale: LinearColorScale = createLinearColorScale([0, steps], [gradientStart, gradientEnd], true)
        colors = [];
        for (let stepIndex: number = 0; stepIndex < steps; stepIndex++) {
            colors.push(colorScale(stepIndex))
        }
    }

    // return the thing ...
    return {
        scale: d3.scaleQuantile<string>()
            .domain([inputMin, inputMax])
            .range(colors),
        colors: colors
    }

}

/**
     * Calculates an array of numbers that divide the range between the input values in uniform intervalls 
     * @param outputMin lower end of input range
     * @param outputMax upper end of input range 
     * @param buckets 
     */
export function getRangePoints(minValue: number, maxValue: number, numSteps: number): number[] {
    if (minValue > maxValue) {
        let tmp = maxValue
        maxValue = minValue
        minValue = tmp
    }

    let delta = (maxValue - minValue) / (numSteps - 1)
    let result = []
    for (let i = 0; i < numSteps; i++) {
        result.push(minValue + i * delta)
    }
    return result
}

/**
 * Returns true if the selectionId is within an array of selectionIds concerning a given source (category, ...)
 * @param selectionIds 
 * @param selectionId 
 * @param source 
 */
export function isSelectionKeyInArray(selectionIds: ISelectionIdVisual[], selectionId: ISelectionIdVisual, source: string): boolean {
    if (!selectionIds || !selectionId) {
        return false;
    }

    if (!selectionIds[0]['dataMap'][source]) {
        return false;
    }

    let isIncluded = selectionIds.map(id => {
        return id['dataMap'][source][0] == selectionId['dataMap'][source][0]
    })
    return isIncluded.some(v => v == true)
}

export function syncSelectionState(
    selection: Selection<DataPoint>,
    selectionIds: ISelectionId[]
): void {
    //     if (!selection || !selectionIds) {
    //         return;
    //     }

    //     if (!selectionIds.length) {
    //         selection.style({
    //             "fill-opacity": null,
    //             "stroke-opacity": null,
    //         });

    //         return;
    //     }

    //     const self: this = this;

    //     selection.each(function (barDataPoint: BarChartDataPoint) {
    //         const isSelected: boolean = self.isSelectionIdInArray(selectionIds, barDataPoint.selectionId);

    //         const opacity: number = isSelected
    //             ? BarChart.Config.solidOpacity
    //             : BarChart.Config.transparentOpacity;

    //         d3.select(this).style({
    //             "fill-opacity": opacity,
    //             "stroke-opacity": opacity,
    //         });
    //     });
}

export function isSelectionIdInArray(selectionIds: ISelectionId[], selectionId: ISelectionId): boolean {
    if (!selectionIds || !selectionId) {
        return false;
    }

    return selectionIds.indexOf(selectionId) >= 0;
}

/**
 * Adds an animation (if set)
 * @param element 
 * @param suppressAnimations 
 * @param animationDuration 
 */
export function getAnimationMode(element: D3Element, suppressAnimations: boolean, animationDuration: number): D3Element {
    if (suppressAnimations) {
        return element;
    }

    return (<any>element)
        .transition().duration(animationDuration);
}

/**
 * Truncates a txt to a limit provided
 * @param text Text to be truncated
 * @param limit Limit in number of characters
 */
export function textLimit(text: string, limit: number) {
    if (text.length > limit) {
        return ((text || "").substring(0, limit - 3).trim()) + "…";
    }

    return text;
}

/**
 * Truncates a text to a given width (in px)
 * @param text Text to be truncated
 * @param width limit in pixels
 */
export function truncateTextIfNeeded(text: Selection<any>, width: number): void {
    text.call(LabelLayoutStrategy.clip,
        width,
        TextMeasurementService.svgEllipsis);
}

/**
 * Takes a selection, splits it into single words and puts it back 
 * together but only until the width limit is reached 
 * @param text Selection<D3Element>
 * @param width number
 */
export function wrap(text: Selection<D3Element>, width: number): void {

    // we cycle through each element in the text selection
    text.each(function () {

        // define a few things: the selection, each word, lines of text, numbers and heights ...
        let text: Selection<D3Element> = d3.select(this);
        let words: string[] = text.text().split(/\s+/).reverse();
        let word: string;
        let line: string[] = [];
        let lineNumber: number = 0;
        let lineHeight: number = 1.1; // ems

        // do whatever ...
        let x: string = text.attr("x");
        let y: string = text.attr("y");
        let dy: number = parseFloat(text.attr("dy"));
        let tspan: Selection<any> = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

        // now cycle through all words and add 'em until the limit is reached ...
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            let tspannode: any = tspan.node();  // Fixing Typescript error: Property 'getComputedTextLength' does not exist on type 'Element'.
            if (tspannode.getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}