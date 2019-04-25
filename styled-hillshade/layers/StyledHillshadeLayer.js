define([
  "esri/request",

  "esri/layers/TileLayer",
  "esri/layers/BaseTileLayer"
],
function(
  request,
  TileLayer, BaseTileLayer
) {

  return BaseTileLayer.createSubclass({

    properties: {
      title: "Styled Hillshade"
    },

    load() {
      this._hillshade = new TileLayer("https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer");
      this.addResolvingPromise(this._hillshade.load());
      this.addResolvingPromise(this._createPattern());
    },

    fetchTile(level, row, col) {
      return this._hillshade.fetchTile(level, row, col, {
        allowImageDataAccess: true
      })
      .then(image => this._style(image));
    },

    _createPattern() {
      return request("./pattern-pop.png", {
        responseType: "image"
      })
      .then(result => {
        this._pattern = result.data;
      });
    },

    _style(image) {
      // create a canvas
      var width = this.tileInfo.size[0];
      var height = this.tileInfo.size[0];
      var canvas = document.createElement("canvas");
      var context = canvas.getContext("2d");

      canvas.width = width;
      canvas.height = height;

      context.drawImage(image, 0, 0);

      // A tile from the world hillshade is already blended over a while background.
      // convert those pixels so that a white pixel is fully transparent.
      // This will allow use to use this new image with composition
      const imageData = context.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      for (let i = 0; i < width * height * 4; i += 4) {
        const alpha = 255 - (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        pixels[i + 3] = alpha;
      }

      context.putImageData(imageData, 0, 0);

      context.globalCompositeOperation = "source-in";
      context.fillStyle = context.createPattern(this._pattern, "repeat");
      context.fillRect(0, 0, width, height);

      return canvas;
    }
  });

});