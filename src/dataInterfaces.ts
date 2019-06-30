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

import { valueFormatter } from "powerbi-visuals-utils-formattingutils";
import IValueFormatter = valueFormatter.IValueFormatter;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import { numericSequence } from "powerbi-visuals-utils-typeutils";

export interface DataPoint {
    category: powerbi.PrimitiveValue;
    group: Group;
    value: powerbi.PrimitiveValue;
    valueStr: string;
    tooltipInfo?: VisualTooltipDataItem[];
}

export interface Group {
    groupId: powerbi.PrimitiveValue;
    group: powerbi.PrimitiveValue;
    category: powerbi.PrimitiveValue;
}

export interface ChartData {
    dataPoints: DataPoint[];
    categories: powerbi.PrimitiveValue[];
    groups: Group[];
    categoryValueFormatter: IValueFormatter;
    valueFormatter: IValueFormatter;
}

export interface IMargin {
    left?: number;
    right?: number;
    bottom?: number;
    top?: number;
}

export interface ChartSizes {
    vpHeight: number;
    vpWidth: number;
    radarR: number;
    radarCX: number;
    radarCY: number;
    axisLabelHeight: number;    
    angleOffSet: number;
}