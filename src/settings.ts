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

"use strict";

import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

/**
 * Main settings class. All more granular settings go here ...
 */
export class Settings extends DataViewObjectsParser {
    public dataPoint: dataPointSettings = new dataPointSettings();
    public categoryAxis: categoryAxisSettings = new categoryAxisSettings();
    public categoryAxisLabels: categoryLabelSettings = new categoryLabelSettings();
    public dataAxis: DataAxisSettings = new DataAxisSettings();
    public dataAxisLabels: DataAxisLabelsSettings = new DataAxisLabelsSettings();
}

/**
 * Settings for the dataPoints
 */
export class dataPointSettings {
    public static defaultColor: string = "";
    public static showAllDataPoints: boolean = true;
    public static fill: string = "";
    public static fillRule: string = "";
    public static DefaultFontSize: number = 12;

}

/**
 * Settings for the category axis
 */
export class categoryAxisSettings {
    public show: boolean = true;
    public angleOffSet: number = -90;
    public stroke: string = "#E6E6E6";
    public strokeWidth: number = 1;
    public cornerRadius: number = 10;
}

/**
 * Settings for labeling the categories
 */
export class categoryLabelSettings {
    public show: boolean = true;
    public fill: boolean = false;
    public fillColor: string = "#aaa";
    public fontSize: number = dataPointSettings.DefaultFontSize;
    public maxTextSymbol: number = 25;
    public fontFamily: string = "Arial";
}

/**
 * Settings for labeling (and drawing) the data axis
 */
export class DataAxisSettings {
    public invert: boolean = true;
    public minValue: number = 0;
    public maxValue: number = 100;
    public steps: number = 4;
    public stepMode: string = "linear";
    public innerOffset: number = 0;
    public clamp: boolean = true;
    public show: boolean = true;
    public fill: boolean = false;
    public fillColor: string = "#aaa";
    public stroke: string = "#E6E6E6";
    public strokeWidth: string = "1";
    public showFilter: boolean = false;
    public AngleOffset: number = -90;
}

export class DataAxisLabelsSettings {
    public show: boolean = true;
    public fontSize: number = dataPointSettings.DefaultFontSize;
    public maxTextSymbol: number = 25;
    public fontFamily: string = "Arial";
    public color: string = dataPointSettings.defaultColor;
}

/**
 * Type for font settings (mainly for labels) ...
 */
export class TextSettings {
    public fontSize: number = dataPointSettings.DefaultFontSize;
    public maxTextSymbol: number = 25;
    public fontFamily: string = "Arial";
    public color: string = dataPointSettings.defaultColor;
}

