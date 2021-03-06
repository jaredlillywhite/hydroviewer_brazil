/* Global Variables */
var current_layer,
    stream_geom,
    layers,
    wmsLayer,
    vectorLayer,
    feature,
    featureOverlay,
    forecastFolder,
    select_interaction,
    two_year_warning,
    ten_year_warning,
    twenty_year_warning,
    map;
var model = 'ecmwf-rapid';
var $loading = $('#view-file-loading');
var m_downloaded_historical_streamflow = false;
var m_downloaded_flow_duration = false;
//create symbols for warnings
var twenty_symbols = [new ol.style.RegularShape({
    points: 3,
    radius: 5,
    fill: new ol.style.Fill({
        color: 'rgba(128,0,128,0.8)'
    }),
    stroke: new ol.style.Stroke({
        color: 'rgba(128,0,128,1)',
        width: 1
    })
}),new ol.style.RegularShape({
    points: 3,
    radius: 9,
    fill: new ol.style.Fill({
        color: 'rgba(128,0,128,0.3)'
    }),
    stroke: new ol.style.Stroke({
        color: 'rgba(128,0,128,1)',
        width: 1
    })
})];

//symbols
var ten_symbols = [new ol.style.RegularShape({
    points: 3,
    radius: 5,
    fill: new ol.style.Fill({
        color: 'rgba(255,0,0,0.7)'
    }),
    stroke: new ol.style.Stroke({
        color: 'rgba(255,0,0,1)',
        width: 1
    })
}),new ol.style.RegularShape({
    points: 3,
    radius: 9,
    fill: new ol.style.Fill({
        color: 'rgba(255,0,0,0.3)'
    }),
    stroke: new ol.style.Stroke({
        color: 'rgba(255,0,0,1)',
        width: 1
    })
})];

//symbols
var two_symbols = [new ol.style.RegularShape({
    points: 3,
    radius: 5,
    fill: new ol.style.Fill({
        color: 'rgba(255,255,0,0.7)'
    }),
    stroke: new ol.style.Stroke({
        color: 'rgba(255,255,0,1)',
        width: 1
    })
}),new ol.style.RegularShape({
    points: 3,
    radius: 9,
    fill: new ol.style.Fill({
        color: 'rgba(255,255,0,0.3)'
    }),
    stroke: new ol.style.Stroke({
        color: 'rgba(255,255,0,1)',
        width: 1
    })
})];


$(function () {
    $("#forecast_tab_link").click(function(){
        Plotly.Plots.resize($("#long-term-chart .js-plotly-plot")[0]);
    });

    $("#historical_tab_link").click(function(){
        if (!m_downloaded_historical_streamflow && isValidRiverSelected()) {
            addInfoMessage("Loading data ...", "historical_streamflow_data");
            loadHistoricallStreamflowChart();
        }
        else if (m_downloaded_historical_streamflow)
        {
            Plotly.Plots.resize($("#historical-chart .js-plotly-plot")[0]);
        }
    });

    $("#flow_duration_tab_link").click(function(){
        if (!m_downloaded_flow_duration && isValidRiverSelected()) {
            addInfoMessage("Loading data ...", "flow_duration_data");
            loadFlowDurationChart();
        }
        else if (m_downloaded_flow_duration)
        {
            Plotly.Plots.resize($("#fdc-chart .js-plotly-plot")[0]);
        }
    });
})


function init_map(){


    var base_layer = new ol.layer.Tile({
        source: new ol.source.BingMaps({
            key: 'eLVu8tDRPeQqmBlKAjcw~82nOqZJe2EpKmqd-kQrSmg~AocUZ43djJ-hMBHQdYDyMbT-Enfsk0mtUIGws1WeDuOvjY4EXCH-9OK3edNLDgkc',
            imagerySet: 'AerialWithLabels'
        })
    });


    featureOverlay = new ol.layer.Vector({
        source: new ol.source.Vector()
    });

    two_year_warning = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
            image: new ol.style.RegularShape({
                fill: new ol.style.Fill({color: 'yellow'}),
                stroke: new ol.style.Stroke({color: 'black', width: 0.5}),
                points: 3,
                radius: 10,
                angle: 0
            })
        })
    });

    ten_year_warning = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
            image: new ol.style.RegularShape({
                fill: new ol.style.Fill({color: 'red'}),
                stroke: new ol.style.Stroke({color: 'black', width: 0.5}),
                points: 3,
                radius: 10,
                angle: 0
            })
        })
    });

    twenty_year_warning = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
            image: new ol.style.RegularShape({
                fill: new ol.style.Fill({color: 'rgba(128,0,128,0.8)'}),
                stroke: new ol.style.Stroke({color: 'black', width: 0.5}),
                points: 3,
                radius: 10,
                angle: 0
            })
        })
    });




    layers = [base_layer,two_year_warning,ten_year_warning,twenty_year_warning,featureOverlay];
    map = new ol.Map({
        target: 'map',
        view: new ol.View({
            center: ol.proj.transform([84, 28.2], 'EPSG:4326', 'EPSG:3857'),
            zoom: 3,
            minZoom: 2,
            maxZoom: 18,
            zoom:7.5
        }),
        layers:layers
    });

}

function view_watershed(){
    map.removeInteraction(select_interaction);
    map.removeLayer(wmsLayer);
    $("#get-started").modal('hide');
    if ($('#watershedSelect option:selected').val() !== "") {

        $("#watershed-info").empty();

        $('#dates').addClass('hidden');

        var workspace = JSON.parse($('#geoserver_endpoint').val())[1];
        var watershed = $('#watershedSelect option:selected').text().split(' (')[0].replace(' ', '_').toLowerCase();
        var subbasin = $('#watershedSelect option:selected').text().split(' (')[1].replace(')', '').toLowerCase();
        var watershed_display_name = $('#watershedSelect option:selected').text().split(' (')[0];
        var subbasin_display_name = $('#watershedSelect option:selected').text().split(' (')[1].replace(')', '');
        $("#watershed-info").append('<h3>Current Watershed: '+ watershed_display_name + '</h3><h5>Subbasin Name: '+ subbasin_display_name);

        var layerName = workspace+':'+watershed+'-'+subbasin+'-drainage_line';
        wmsLayer = new ol.layer.Image({
            source: new ol.source.ImageWMS({
                url: JSON.parse($('#geoserver_endpoint').val())[0].replace(/\/$/, "")+'/wms',
                params: {'LAYERS':layerName},
                serverType: 'geoserver',
                crossOrigin: 'Anonymous'
            })
        });

        get_warning_points(watershed,subbasin);
        map.addLayer(wmsLayer);

        $loading.addClass('hidden');
        var ajax_url =JSON.parse($('#geoserver_endpoint').val())[0].replace(/\/$/, "")+'/'+workspace+'/'+watershed+'-'+subbasin+'-drainage_line/wfs?request=GetCapabilities';

        var capabilities = $.ajax(ajax_url, {
            type: 'GET',
            data: {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetCapabilities',
                outputFormat: 'text/javascript'
            },
            success: function () {
                var x = capabilities.responseText
                    .split('<FeatureTypeList>')[1]
                    .split(workspace + ':' + watershed + '-' + subbasin)[1]
                    .split('LatLongBoundingBox ')[1]
                    .split('/></FeatureType>')[0];

                var minx = Number(x.split('"')[1]);
                var miny = Number(x.split('"')[3]);
                var maxx = Number(x.split('"')[5]);
                var maxy = Number(x.split('"')[7]);
                var extent = ol.proj.transform([minx, miny], 'EPSG:4326', 'EPSG:3857').concat(ol.proj.transform([maxx, maxy], 'EPSG:4326', 'EPSG:3857'));

                map.getView().fit(extent, map.getSize())
            }
        });

    } else {

        map.updateSize();
        //map.removeInteraction(select_interaction);
        map.removeLayer(wmsLayer);
        map.getView().fit([-13599676.07249856, -6815054.405920124, 13599676.07249856, 11030851.461876547], map.getSize());
    }
}

function get_warning_points(watershed,subbasin){
    $.ajax({
        type: 'GET',
        url: 'ecmwf-rapid/get-warning-points/',
        dataType: 'json',
        data: {
            'watershed': watershed,
            'subbasin': subbasin
        },
        error: function (error) {
            console.log(error);
        },
        success: function (result) {

            map.getLayers().item(1).getSource().clear();
            map.getLayers().item(2).getSource().clear();
            map.getLayers().item(3).getSource().clear();

            if(result.warning2 != 'undefined'){
                var warLen2 = result.warning2.length;
                for (var i = 0; i < warLen2; ++i) {
                    var geometry = new ol.geom.Point(ol.proj.transform([result.warning2[i].geometry.coordinates[0],
                            result.warning2[i].geometry.coordinates[1]],
                        'EPSG:4326', 'EPSG:3857'));
                    var feature = new ol.Feature({
                        geometry: geometry,
                        point_size: result.warning2[i].properties.size
                    });
                    map.getLayers().item(1).getSource().addFeature(feature);
                }
                map.getLayers().item(1).setVisible(true);
            }

            if(result.warning10 != 'undefined'){
                var warLen10 = result.warning10.length;
                for (var j = 0; j < warLen10; ++j) {
                    var geometry = new ol.geom.Point(ol.proj.transform([result.warning10[j].geometry.coordinates[0],
                            result.warning10[j].geometry.coordinates[1]],
                        'EPSG:4326', 'EPSG:3857'));
                    var feature = new ol.Feature({
                        geometry: geometry,
                        point_size: result.warning10[j].properties.size
                    });
                    map.getLayers().item(2).getSource().addFeature(feature);
                }
                map.getLayers().item(2).setVisible(true);
            }

            if(result.warning20 != 'undefined'){
                var warLen20 = result.warning20.length;
                for (var k = 0; k < warLen20; ++k) {
                    var geometry = new ol.geom.Point(ol.proj.transform([result.warning20[k].geometry.coordinates[0],
                            result.warning20[k].geometry.coordinates[1]],
                        'EPSG:4326', 'EPSG:3857'));
                    var feature = new ol.Feature({
                        geometry: geometry,
                        point_size: result.warning20[k].properties.size
                    });
                    map.getLayers().item(3).getSource().addFeature(feature);
                }
                map.getLayers().item(3).setVisible(true);
            }

        }
    });
}

function get_available_dates(watershed, subbasin,comid) {

    $.ajax({
        type: 'GET',
        url: 'ecmwf-rapid/get-available-dates/',
        dataType: 'json',
        data: {
            'watershed': watershed,
            'subbasin': subbasin,
            'comid':comid
        },
        error: function () {
            $('#dates').html(
                '<p class="alert alert-danger" style="text-align: center"><strong>An error occurred while retrieving the available dates</strong></p>'
            );

            setTimeout(function () {
                $('#dates').addClass('hidden')
            }, 5000);
        },
        success: function (dates) {
            datesParsed = JSON.parse(dates.available_dates);
            $('#datesSelect').empty();

            $.each(datesParsed, function(i, p) {
                var val_str = p.slice(1).join();
                $('#datesSelect').append($('<option></option>').val(val_str).html(p[0]));
            });

        }
    });
}

function get_return_periods(watershed, subbasin, comid) {
    $.ajax({
        type: 'GET',
        url: 'ecmwf-rapid/get-return-periods/',
        dataType: 'json',
        data: {
            'watershed': watershed,
            'subbasin': subbasin,
            'comid': comid
        },
        error: function () {
            $('#info').html(
                '<p class="alert alert-warning" style="text-align: center"><strong>Return Periods are not available for this dataset.</strong></p>'
            );

            $('#info').removeClass('hidden');

            setTimeout(function () {
                $('#info').addClass('hidden')
            }, 5000);
        },
        success: function (data) {
            $("#container").highcharts().yAxis[0].addPlotBand({
                from: parseFloat(data.return_periods.twenty),
                to: parseFloat(data.return_periods.max),
                color: 'rgba(128,0,128,0.4)',
                id: '20-yr',
                label: {
                    text: '20-yr',
                    align: 'right'
                }
            });
            $("#container").highcharts().yAxis[0].addPlotBand({
                from: parseFloat(data.return_periods.ten),
                to: parseFloat(data.return_periods.twenty),
                color: 'rgba(255,0,0,0.3)',
                id: '10-yr',
                label: {
                    text: '10-yr',
                    align: 'right'
                }
            });
            $("#container").highcharts().yAxis[0].addPlotBand({
                from: parseFloat(data.return_periods.two),
                to: parseFloat(data.return_periods.ten),
                color: 'rgba(255,255,0,0.3)',
                id: '2-yr',
                label: {
                    text: '2-yr',
                    align: 'right'
                }
            });
        }
    });
}

function get_time_series(model, watershed, subbasin, comid, startdate) {
    $loading.removeClass('hidden');
    $('#long-term-chart').addClass('hidden');
    $('#dates').addClass('hidden');
    $.ajax({
        type: 'GET',
        url: 'ecmwf-rapid/get-time-series/',
        data: {
            'model': model,
            'watershed': watershed,
            'subbasin': subbasin,
            'comid': comid,
            'startdate': startdate
        },
        error: function () {
            $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the forecast</strong></p>');
            $('#info').removeClass('hidden');

            setTimeout(function () {
                $('#info').addClass('hidden')
            }, 5000);
        },
        success: function (data) {
            if (!data.error) {
                $('#dates').removeClass('hidden');
                $loading.addClass('hidden');
                $('#long-term-chart').removeClass('hidden');
                $('#long-term-chart').html(data);

                var params = {
                    watershed_name: watershed,
                    subbasin_name: subbasin,
                    reach_id: comid,
                    startdate: startdate,
                };

                $('#submit-download-forecast').attr({
                    target: '_blank',
                    href: 'ecmwf-rapid/get-forecast-data-csv?' + jQuery.param( params )
                });

                $('#download_forecast').removeClass('hidden');

            } else if (data.error) {
                $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the forecast</strong></p>');
                $('#info').removeClass('hidden');

                setTimeout(function () {
                    $('#info').addClass('hidden')
                }, 5000);
            } else {
                $('#info').html('<p><strong>An unexplainable error occurred.</strong></p>').removeClass('hidden');
            }
        }
    });
}


function get_historic_data (model, watershed, subbasin, comid, startdate) {
    $('#his-view-file-loading').removeClass('hidden');
    m_downloaded_historical_streamflow = true;
    $.ajax({
        type: 'GET',
        url: 'ecmwf-rapid/get-historic-data',
        data: {
            'model': model,
            'watershed': watershed,
            'subbasin': subbasin,
            'comid': comid,
            'startdate': startdate
        },
        success: function (data) {
            if (!data.error) {
                $('#his-view-file-loading').addClass('hidden');
                $('#historical-chart').removeClass('hidden');
                $('#historical-chart').html(data);

                var params = {
                    watershed_name: watershed,
                    subbasin_name: subbasin,
                    reach_id: comid,
                    daily: false
                };

                $('#submit-download-interim-csv').attr({
                    target: '_blank',
                    href: 'ecmwf-rapid/get-historic-data-csv?' + jQuery.param( params )
                });

                $('#download_interim').removeClass('hidden');

            } else if (data.error) {
                $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the historic data</strong></p>');
                $('#info').removeClass('hidden');

                setTimeout(function () {
                    $('#info').addClass('hidden')
                }, 5000);
            } else {
                $('#info').html('<p><strong>An unexplainable error occurred.</strong></p>').removeClass('hidden');
            }
        }
    });
};


function get_flow_duration_curve (model, watershed, subbasin, comid, startdate) {
    $('#fdc-view-file-loading').removeClass('hidden');
    m_downloaded_flow_duration = true;
    $.ajax({
        type: 'GET',
        url: 'ecmwf-rapid/get-flow-duration-curve',
        data: {
            'model': model,
            'watershed': watershed,
            'subbasin': subbasin,
            'comid': comid,
            'startdate': startdate
        },
        success: function (data) {
            if (!data.error) {
                $('#fdc-view-file-loading').addClass('hidden');
                $('#fdc-chart').removeClass('hidden');
                $('#fdc-chart').html(data);
            } else if (data.error) {
                $('#info').html('<p class="alert alert-danger" style="text-align: center"><strong>An unknown error occurred while retrieving the historic data</strong></p>');
                $('#info').removeClass('hidden');

                setTimeout(function () {
                    $('#info').addClass('hidden')
                }, 5000);
            } else {
                $('#info').html('<p><strong>An unexplainable error occurred.</strong></p>').removeClass('hidden');
            }
        }
    });
};


function map_events(){
    map.on('pointermove', function(evt) {
        if (evt.dragging) {
            return;
        }
        var pixel = map.getEventPixel(evt.originalEvent);
        var hit = map.forEachLayerAtPixel(pixel, function(layer) {
            if (layer != layers[0] && layer != layers[1] && layer != layers[2] && layer != layers[3]){
                current_layer = layer;
                return true;}
        });
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    map.on("singleclick",function(evt) {

        if (map.getTargetElement().style.cursor == "pointer") {
            $("#graph").modal('show');

            $('#long-term-chart').addClass('hidden');
            $('#historical-chart').addClass('hidden');
            $('#fdc-chart').addClass('hidden');
            $('#download_forecast').addClass('hidden');
            $('#download_interim').addClass('hidden');

            var view = map.getView();
            var viewResolution = view.getResolution();

            var wms_url = current_layer.getSource().getGetFeatureInfoUrl(evt.coordinate, viewResolution, view.getProjection(), {'INFO_FORMAT': 'application/json'}); //Get the wms url for the clicked point
            if (wms_url) {
                $loading.removeClass('hidden');
                //Retrieving the details for clicked point via the url
                $('#dates').addClass('hidden');
                //$('#plot').addClass('hidden');
                $.ajax({
                    type: "GET",
                    url: wms_url,
                    dataType: 'json',
                    success: function (result) {
                        var comid = result["features"][0]["properties"]["COMID"];
                        var startdate = '';
                        if ("derived_fr" in (result["features"][0]["properties"])) {
                            var watershed = (result["features"][0]["properties"]["derived_fr"]).toLowerCase().split('-')[0];
                            var subbasin = (result["features"][0]["properties"]["derived_fr"]).toLowerCase().split('-')[1];
                        } else if (JSON.parse($('#geoserver_endpoint').val())[2]) {
                            var watershed = JSON.parse($('#geoserver_endpoint').val())[2].split('-')[0]
                            var subbasin = JSON.parse($('#geoserver_endpoint').val())[2].split('-')[1];
                        } else {
                            var watershed = (result["features"][0]["properties"]["watershed"]).toLowerCase();
                            var subbasin = (result["features"][0]["properties"]["subbasin"]).toLowerCase();
                        };

                        var workspace = JSON.parse($('#geoserver_endpoint').val())[1];

                        var model = 'ecmwf-rapid';
                        $('#info').addClass('hidden');
                        add_feature(workspace,comid);

                        get_available_dates(watershed, subbasin,comid);
                        get_time_series(model, watershed, subbasin, comid, startdate);
                        get_historic_data(model, watershed, subbasin, comid, startdate);
                        get_flow_duration_curve(model, watershed, subbasin, comid, startdate);
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        console.log(Error);
                    }
                });
            }
        };
    });

}

function add_feature(workspace,comid){
    map.removeLayer(featureOverlay);

    var watershed = $('#watershedSelect option:selected').text().split(' (')[0].replace(' ', '_').toLowerCase();
    var subbasin = $('#watershedSelect option:selected').text().split(' (')[1].replace(')', '').toLowerCase();

    var vectorSource = new ol.source.Vector({
        format: new ol.format.GeoJSON(),
        url: function (extent) {
            return JSON.parse($('#geoserver_endpoint').val())[0].replace(/\/$/, "")+'/'+'ows?service=wfs&' +
                'version=2.0.0&request=getfeature&typename='+workspace+':'+watershed+'-'+subbasin+'-drainage_line'+'&CQL_FILTER=COMID='+comid+'&outputFormat=application/json&srsname=EPSG:3857&' + ',EPSG:3857';
        },
        strategy: ol.loadingstrategy.bbox
    });


    featureOverlay = new ol.layer.Vector({
        source: vectorSource,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#00BFFF',
                width: 8
            })
        })
    });
    map.addLayer(featureOverlay);
    map.getLayers().item(5)

}
$(function(){
    $('#app-content-wrapper').removeClass('show-nav');
    $(".toggle-nav").removeClass('toggle-nav');
    init_map();
    map_events();
    $('#datesSelect').change(function() { //when date is changed
        var sel_val = ($('#datesSelect option:selected').val()).split(',');
        var startdate = sel_val[0];
        var watershed = sel_val[1];
        var subbasin = sel_val[2];
        var comid = sel_val[3];
        var model = 'ecmwf-rapid';
        $loading.removeClass('hidden');
        get_time_series(model, watershed, subbasin, comid, startdate);
    });
});