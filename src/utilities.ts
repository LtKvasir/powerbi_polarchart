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

import { pixelConverter as PixelConverter } from "powerbi-visuals-utils-typeutils";
import { valueFormatter, textMeasurementService } from "powerbi-visuals-utils-formattingutils";
import TextMeasurementService = textMeasurementService.textMeasurementService;

import {
    ChartData,
    DataPoint,
    ChartSizes
} from "./dataInterfaces";

import {
    Settings,
    DataAxisSettings
} from "./settings";

/**
 * Gets the height of a text field to calculate space needed for axis ...
 * @param chartData 
 */
export function getCategoryAxisHeight(chartData: ChartData, settings: Settings): number {

    // if the axis are turned off, we return 0
    if (!settings.categoryLabels.show) { return 0 }

    // first we see what the longest text value is (in characters)... 
    let maxLengthText: powerbi.PrimitiveValue = _.maxBy(chartData.groups.map(v => v.group), "length") || "";

    // we now return the size (in pixels) d3 needs for this ...
    return TextMeasurementService.measureSvgTextHeight({
        fontSize: PixelConverter.toString(settings.categoryLabels.fontSize),
        text: maxLengthText.toString().trim(),
        fontFamily: settings.categoryLabels.fontFamily
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

export function getTextSize(text: string, fontsize, fontFamily) {
    let width = TextMeasurementService.measureSvgTextWidth({
        fontSize: fontsize,
        fontFamily: fontFamily,
        text: text
    })

    let height = TextMeasurementService.measureSvgTextHeight({
        fontSize: fontsize,
        fontFamily: fontFamily,
        text: text
    })

    return {width: width, height: height}
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