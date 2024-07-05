const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/index.ts",
  output: {
    path: __dirname + "/dist",
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
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[path][name].[ext]",
            },
          },
        ],
      },
      {
        test: /\.(woff|woff2|ttf|otf|eot)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[path][name].[ext]",
            },
          },
        ],
      },
    ],
  },
  devtool: "inline-source-map",
  plugins: [
    new HtmlWebpackPlugin({ template: "./src/index.html" }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "assets/doom1.wad" },
        { from: "assets/default.cfg" },
        { from: "assets/websockets-doom.js" },
        { from: "assets/websockets-doom.wasm" },
        { from: "assets/websockets-doom.wasm.map" },
        { from: "assets/favicon.ico" },
        { from: "assets/background.jpg" },
        { from: "assets/background-2.jpg" },
        { from: "assets/logo.png" },
        { from: "assets/monster.jpg" },
      ],
    }),
  ],
};
