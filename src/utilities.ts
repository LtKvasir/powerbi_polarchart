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

import TextMeasurementService = textMeasurementService.textMeasurementService;

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





// function computeDimensions(selection) {
//     var dimensions = null;
//     var node = selection.node();

//     if (node instanceof SVGElement) { // check if node is svg element
//       dimensions = node.getBBox();
//     } else { // else is html element
//       dimensions = node.getBoundingClientRect();
//     }
//     console.log(dimensions);
//     return dimensions;
//   }