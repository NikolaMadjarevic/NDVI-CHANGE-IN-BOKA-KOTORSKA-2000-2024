/*****************************************************
 Project: NDVI Change Analysis – Boka Kotorska
 Author: Nikola Mađarević
 Year: 2026

 Description:
 This project analyzes vegetation changes in Boka Kotorska 
 between 2000 and 2024  using Landsat NDVI composites in
 Google Earth Engine.

 Tools:
 - Google Earth Engine
 - Landsat Collection 2
 - ArcGIS Pro
*****************************************************/
//Define the area of interest (AOI)
var aoi = ee.Geometry.Rectangle([18.45, 42.33, 18.90, 42.55]);
Map.centerObject(aoi, 11);
Map.setOptions('SATELLITE');

//Load Landsat NDVI dataset
var landsatNDVI = ee.ImageCollection('LANDSAT/COMPOSITES/C02/T1_L2_32DAY_NDVI')
                    .filterBounds(aoi);

//Generate annual mean NDVI composite
function report(year) {
  var start = ee.Date.fromYMD(year,1,1);
  var end = start.advance(1, 'year');
  return landsatNDVI
           .filterDate(start, end)
           .mean()
           .set('year', year);
}

//Generate NDVI composites for comparison
var ndvi2000 = report(2000);
var ndvi2024 = report(2024);

//Display NDVI layers
var ndviVis = {min:-1, max:1, palette:['red','yellow','green']};

Map.addLayer(ndvi2000.clip(aoi), ndviVis, 'NDVI 2000');
Map.addLayer(ndvi2024.clip(aoi), ndviVis, 'NDVI 2024');

//Calculate NDVI difference (2000–2024)
var ndviDiff = ndvi2024.subtract(ndvi2000);

//Visualization parameters
var diffVis = {min:-1, max:1, palette:['red','white','green']};
Map.addLayer(ndviDiff.clip(aoi), diffVis, 'NDVI change');

//Compute NDVI statistics
var stats = ndviDiff.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: aoi,
  scale: 30,
  maxPixels: 1e9
});

//Export layers to drive
Export.image.toDrive({
  image: ndvi2000.clip(aoi),
  description: 'NDVI_Boka_2000',
  folder: 'GEE_SEMINARSKI',
  fileNamePrefix: 'NDVI_Boka_2000',
  region: aoi,
  scale: 30,
  crs: 'EPSG:32634',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: ndvi2024.clip(aoi),
  description: 'NDVI_Boka_2024',
  folder: 'GEE_SEMINARSKI',
  fileNamePrefix: 'NDVI_Boka_2024',
  region: aoi,
  scale: 30,
  crs: 'EPSG:32634',
  maxPixels: 1e13
});

Export.image.toDrive({
  image: ndviDiff.clip(aoi),
  description: 'NDVI_Boka_Razlika_2000_2024',
  folder: 'GEE_SEMINARSKI',
  fileNamePrefix: 'NDVI_Boka_Razlika_2000_2024',
  region: aoi,
  scale: 30,
  crs: 'EPSG:32634',
  maxPixels: 1e13
});

//Export datasets to Google Earth Engine Assets
Export.image.toAsset({
  image: ndvi2000.clip(aoi),
  description: 'NDVI_Boka_2000_Asset',
  assetId: 'users/madjarevicn2/NDVI_Boka_2000',
  region: aoi,
  scale: 30,
  maxPixels: 1e13
});

Export.image.toAsset({
  image: ndvi2024.clip(aoi),
  description: 'NDVI_Boka_2024_Asset',
  assetId: 'users/madjarevicn2/NDVI_Boka_2024',
  region: aoi,
  scale: 30,
  maxPixels: 1e13
});

Export.image.toAsset({
  image: ndviDiff.clip(aoi),
  description: 'NDVI_Boka_Razlika_Asset',
  assetId: 'users/madjarevicn2/NDVI_Boka_Razlika',
  region: aoi,
  scale: 30,
  maxPixels: 1e13
});

//Load exported NDVI assets
var ndvi2000_asset = ee.Image('users/madjarevicn2/NDVI_Boka_2000');
var ndvi2024_asset = ee.Image('users/madjarevicn2/NDVI_Boka_2024');
var ndviDiff_asset = ee.Image('users/madjarevicn2/NDVI_Boka_Razlika');
print('Mean NDVI change in Boka Kotorska (2000–2024):', stats.get('NDVI'));
//USER INTERFACE

//===============================
//UI PANEL – Year select and zoom
//===============================
var panel = ui.Panel({
  style: { width: '300px', padding: '10px' }
});

panel.add(ui.Label({
  value: 'NDVI analysis – Boka Kotorska',
  style: { fontSize: '16px', fontWeight: 'bold' }
}));

panel.add(ui.Label('Select a year to compare with 2024:'));

//Available years
var years = [];
for (var y = 2000; y <= 2024; y++) {
  years.push(y.toString());
}

//Dropdown for years
var yearSelect = ui.Select({
  items: years,
  value: '2000'
});

//Zoom slider
var zoomSlider = ui.Slider({
  min: 8,
  max: 15,
  value: 11,
  step: 1,
  onChange: function(value) {
    Map.setZoom(value);
  }
});

panel.add(yearSelect);
panel.add(ui.Label('Zoom level'));
panel.add(zoomSlider);

ui.root.insert(0, panel);

//===============================
//Update map based on selected year
//===============================
function updateMap(year) {
  Map.layers().reset();

  var ndviYear = report(parseInt(year));
  var ndviDiff = ndvi2024.subtract(ndviYear);

  Map.addLayer(ndviYear.clip(aoi), ndviVis, 'NDVI ' + year);
  Map.addLayer(ndvi2024.clip(aoi), ndviVis, 'NDVI 2024', false);
  Map.addLayer(ndviDiff.clip(aoi), diffVis, 'Difference (' + year + ' - 2024)');
}

//Listener for dropdown
yearSelect.onChange(updateMap);

//Legend
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px',
    backgroundColor: 'white'
  }
});

legend.add(ui.Label('Vegetation change legend', { fontWeight: 'bold' }));

function legendRow(color, text) {
  return ui.Panel({
    widgets: [
      ui.Label('', {
        backgroundColor: color,
        padding: '8px',
        margin: '0 4px 0 0'
      }),
      ui.Label(text)
    ],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
}

legend.add(legendRow('red', 'Vegetation loss'));
legend.add(legendRow('#FFF7F7', 'No change in vegetatiton'));
legend.add(legendRow('green', 'Vegetation gain'));
Map.add(legend)

//Initial view
updateMap('2000');