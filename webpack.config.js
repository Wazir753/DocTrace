const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV || "development",
  entry: {
    background: "./background.js",
    content: "./content.js",
    sidebar: "./sidebar/sidebar.jsx",
    popup: "./popup/popup.jsx",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { targets: "last 2 Chrome versions" }],
              ["@babel/preset-react", { runtime: "automatic" }],
            ],
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  plugins: [
    // Copy manifest and other static files
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "images/", to: "images/" },
        { from: "utils/", to: "utils/", globOptions: { ignore: ["**/*.test.js"] } },
        { from: "sidebar/sidebar.html", to: "sidebar/sidebar.html" },
        { from: "popup/popup.html", to: "popup/popup.html" },
      ],
    }),
  ],
  devtool: process.env.NODE_ENV === "production" ? false : "source-map",
  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
};
