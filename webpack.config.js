const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const Dotenv = require("dotenv-webpack");
const path = require("path");

module.exports = {
  mode: "development",
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        resolve: {
          extensions: [".ts", ".tsx", ".js", ".json"],
        },
        use: "ts-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|otf|eot)$/i,
        type: "asset/resource",
        generator: {
          filename: "assets/[name][ext]",
        },
      },
    ],
  },
  devtool: "inline-source-map",
  plugins: [
    new Dotenv(),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "assets/doom1.wad" },
        { from: "assets/default.cfg" },
        { from: "assets/websockets-doom.js" },
        { from: "assets/websockets-doom.wasm" },
        { from: "assets/websockets-doom.wasm.map" },
        { from: "assets/images/hydra_outline_small.png", to: "assets/images" },
        { from: "assets/images/favicon.png", to: "assets/images" },
        { from: "assets/images/hydra-logo-2-0x.png", to: "assets/images" },
        { from: "assets/images/hydra-text-1-0x.png", to: "assets/images" },
        { from: "assets/images/hydra-text-1-5x.png", to: "assets/images" },
        { from: "assets/images/bg-0-5x.jpg", to: "assets/images" },
        { from: "assets/images/bg-1-0x.jpg", to: "assets/images" },
        { from: "assets/images/bg-1-5x.jpg", to: "assets/images" },
        { from: "assets/images/sundae-labs-logo.svg", to: "assets/images" },
        { from: "assets/images/iog-logo.png", to: "assets/images" },
        { from: "assets/music/blue-screen-of-death.mp3", to: "assets/music" },
        { from: "assets/music/demons-prowl.mp3", to: "assets/music" },
        { from: "assets/music/dooms-fate.mp3", to: "assets/music" },
        { from: "assets/music/mark-of-malice.mp3", to: "assets/music" },
        { from: "assets/music/unnamed.mp3", to: "assets/music" },
      ],
    }),
  ],
};
