module.exports = function (options, webpack) {
  // Instrui o Webpack a ignorar os módulos opcionais do Console Ninja / Express
  options.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /^(atpl|twig|eco|hamljs|just|dot|react-dom\/server|react|marko|teacup\/lib\/express|squirrelly|twing)$/,
    })
  );
  
  return options;
};