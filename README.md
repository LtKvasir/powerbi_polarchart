# Overview

This project contains a custom visual for PowerBI that displays data in a "radar chart", which is a visualization similar (but a bit different) to the more common "spider chart". The visual focuses on (i) a broad range of features within this chart type and (ii) a high customizability by the user regarding styling the visual (which is annoyingly seldom in the PowerBI stndard visuals).

Before describing how the visual works, I'd like to highlight two things ...

## This project ist written by an amateur PowerBI'ist and Programmer, 
which has three implications: First there is limited support from my side, although I'll try my best to help out. Second I really appreciate feedback. Not only regarding functionality but also regarding code quality, ... (I'm trying to learn). Third, as all the content provided by the community (however more D3 community than the seemingly small PowerBI community) helped me immensely, I'm really happy to share this piece of code also. So feel free to use it however you like - as long as you maintain the mandatory licensing conditions I also need to oblige (whatever they are in detail - I don't really get 'em)

## A word of warning regarding "radar charts" and "spider charts"
These kind of charts are common, but not too common for a reason. They do provide a beautiful and easy to grasp visualisation for some kind of data, but can get hard to read quite fast. Primarily these charts are optimal for 2-dimensional data. I.e. showing **one** pupils performance (_1st dimension_) in different skill (_2nd dimension_). They might also work well with a third dimension (i.e. comparing different pupils). However only if the data count in the third dimension (i.e. number off pupils) is low (doing a wild guess ... 2-5 pupils).

Now, the custom visual at hand allows you to plot up to **5.5 dimensions**: (_1.5_) Angle on the chart in differend clusters (i.e. Skills divided in skill areas), (_2_) distance to the center (i.e. performance for the skills), (_3_) size of the datapoint (i.e. how the pupil scored in a test), (_4_) color of the datapoint (i.e. how the pupil likes this skill) and (_5_) shape of the datapoint (i.e. different pupils).
Honestly, not even me who coded this visual can think of a case where using all of this dimensions might lead to a visualisation that will be easily understandable and helpful represantation of data. In other words - this visual is the death-star of visuals. Lots of power but hard to handle. So use it with care.

# Basic useage






# Features not yet there but I'd like to add

- Icons
- Labels (LABEL FOR CAT. SUBFIELDS IN RING)
- Cut text lenghts
- Legends
- Animations
- FIX CLASSES: NO SPACES, ...
- CLEVER COLORPICKER FOR CATEGORIES: SHOW AS MANY COLORS AS THERE ARE CATEGORIES

