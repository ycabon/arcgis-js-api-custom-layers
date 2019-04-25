define([
  "require",

  "esri/request",

  "esri/core/workers",

  "esri/layers/BaseTileLayer"
],
function(
  require,
  esriRequest,
  workers,
  BaseTileLayer
) {

  // http://blog.bruce-hill.com/meandering-triangles/

  return BaseTileLayer.createSubclass({
    properties: {
      url: "https://elevation.arcgis.com/arcgis/rest/services/NED30m/ImageServer",
      elevations: {
        value: [
          {
            value: 1000,
            lineWidth: 1,
            strokeStyle: "red"
          }
        ]
      }
    },

    load: function() {
      // The worker needs an absolute module id.
      var workerMid = require.toAbsMid("./worker/ContourWorker");

      // Load the module in a worker
      var promise = workers.open(workerMid, { client: this })
        .then(function(connection) {
          this._connection = connection;
        }.bind(this));

      this.addResolvingPromise(promise);
    },

    getTileUrl: function(level, row, col) {
      var bounds = this.getTileBounds(level, row, col);
      return `${this.url}/exportImage?bbox=${bounds[0]}%2C${bounds[1]}%2C${bounds[2]}%2C${bounds[3]}&bboxSR=102100&size=257%2C257&imageSR=102100&time=&format=lerc&pixelType=F32&noData=&noDataInterpretation=esriNoDataMatchAny&interpolation=+RSP_BilinearInterpolation&f=image`;
    },

    fetchTile: function(level, row, col) {
      var url = this.getTileUrl(level, row, col);

      return esriRequest(url, {
        responseType: "array-buffer"
      })
      .then(function(response) {
        var elevations = this.elevations.map(function (elevation) {
          return elevation.value;
        });

        return this._connection.invoke("generateContours", {
          lerc: response.data,
          elevations: elevations,
          width: this.tileInfo.size[0],
          height: this.tileInfo.size[1],
        }, {
          transferList: [response.data]
        });
      }.bind(this))
      .then(function(contours) {
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");
        var width = this.tileInfo.size[0];
        var height = this.tileInfo.size[1];

        canvas.width = width;
        canvas.height = height;

        //context.fillStyle = "black";
        //context.fillRect(0, 0, width, height);

        this.elevations.forEach(function(elevationInfo) {
          context.lineWidth = elevationInfo.lineWidth;
          context.strokeStyle = elevationInfo.strokeStyle;
          this._drawContourLines(context, contours[elevationInfo.value]);
        }, this);

        return canvas;
      }.bind(this));
    },

    _drawContourLines(context, contourLines) {
      for (var i = 0; i < contourLines.length; i++) {
        var line = contourLines[i];

        context.beginPath();
        context.moveTo(line[0][0], line[0][1]);

        for (var j = 1; j < line.length; j++) {
          context.lineTo(line[j][0], line[j][1]);
        }

        context.stroke();
      }
    }

  });

});
