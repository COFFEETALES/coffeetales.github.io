const purify = require('purify-css');
const fs = require('fs');

const content = ['index.html'];
const css = ['assets/bootstrap/bootstrap.min.css', 'assets/style.min.css'];

const options = {
    minify: true,
    info: true
};

purify(content, css, options, function(purifiedAndMinifiedResult) {
    css.forEach((cssFile, index) => {
        fs.writeFile(cssFile, purifiedAndMinifiedResult, 'utf8', function(err) {
            if (err) {
                console.error(`Error writing to ${cssFile}:`, err);
            } else {
                console.log(`Successfully purified and minified ${cssFile}`);
            }
        });
    });
});
