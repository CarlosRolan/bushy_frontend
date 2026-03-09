const path = require("path");
const Dotenv = require("dotenv-webpack");

module.exports = {
  entry: {
    game: "./src/client/index.js",
    menu: "./src/client/menuBackground.js",
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  plugins: [new Dotenv()],
  devServer: {
    static: {
      directory: path.resolve(__dirname),
    },
    port: 3000,
    open: true,
  },
};
