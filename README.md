# Overview

This project contains a custom visual for PowerBI that displays data in a "radar chart", which is a visualization similar (but a bit different) to the more common "spider chart". The visual focuses on 
1. a broad range of features within this chart type and 
2. a high customizability for the user regarding styling of the visual (which annoyingly few PowerBI standard visuals have).

Before describing how the visual works, I'd like to highlight two things ...

***This project ist written by an amateur PowerBI'ist and programmer***, 
which has three implications: First there is limited support from my side, although I'll try my best to help out. Second, I really appreciate feedback. Not only regarding functionality of the visual but also regarding code quality ecc. (I'm trying to learn). Third, as the large amount of content available within the community (however, more from the D3 community than the seemingly small PowerBI community) helped me immensely, I'd like to pay back and am really happy to share this piece of code. So feel free to use it - as long as you maintain the mandatory licensing conditions I also need to oblige (whatever they are in detail - I don't really get 'em)

***A word of warning regarding "radar charts" and "spider charts"***
These kind of charts are common, but not too common for a reason. They do provide a beautiful and easy to grasp visualisation for some kind of data, but can get hard to read quite fast. 
Primarily these charts work well for 2-dimensional data. I.e. showing **one** pupil's performance (_1st dimension_) in different skills (_2nd dimension_). They might also work well with a third dimension (i.e. comparing different pupils), however only if the third dimension only has limited data (i.e. small number off pupils).

The custom visual at hand allows you to plot up to **5.5 dimensions**: (_1.5_) The angle of the data point grouped differend clusters (i.e. skills divided in skill areas), (_2_) the distance to the center (i.e. performance for a particular skill (angle)), (_3_) size of the datapoint (i.e. how the pupil scored in a test), (_4_) color of the data point (i.e. how the pupil likes this skill) and (_5_) shape of the datapoint (i.e. different pupils).

Honestly, not even me who coded this visual can think of a case where using all of this dimensions might lead to a visualisation that will be easily understandable and helpful represantation of data. In other words - this visual is the death-star of visuals. Lots of power but hard to handle. So use it with care.

# Basic useage

## Data fields
- **Category**:
- **Grouping**:
- **DataFields**:
    - *First (Distance) [Mandatory]*:
    - *Second (Size/Symbol)*:
    - *Third (Color)*:
    - *Others (Tooltip only)*:

## Options
- **Basic Data**:
- **Inner Circle**:
- **Grouping**:
- **Impact Settings**:
- **Preparedness Settings**:
- **Category Axis**:
- **Category Axis Labels**:
- **Data Axis**:
- **Data Axis Labels**:
- **Legend**:

# Known Bugs
- [ ] Loading the visual with filtered groups (i.e show 2 of 4 groups) and extending the filter afterwards (i.e. show 4 of 4 groups) will lead to multiple groups having the same color
- [ ] won't work without a second measure for "Impact"

# Features to be added (sometime)

- [ ] Custom Colors for groups selectable by the user in the options
- [ ] Remember relative label position when updating the chart (don't know if this will work)
- [ ] Select dataPoints based on background segment clicked
- [ ] Visually highlight background segments based on selection
- [ ] Enable Bookmarks
- [ ] Enable less than 360 degree visual
- [ ] Background for Data Labels

