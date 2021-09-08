'use strict';

const YAML = require('yaml');
const merge = require('deepmerge');
const fs = require('fs');

const dropKeys = (obj, keys) => {
    keys.forEach(key => delete obj[key]);
    return obj;
};

const modifyRefPrefix = (obj, stripPrefix, prependPrefix) => {
    const keys = Object.keys(obj);
    keys.forEach(key => {
        if (key != '$ref' && obj[key] instanceof Object) {
            modifyRefPrefix(obj[key], stripPrefix, prependPrefix);
        } else if (key === '$ref') {
            obj[key] = obj[key].replace(stripPrefix, prependPrefix);
        }
    });
};

const modifyPathPrefix = (obj, stripPrefix, prependPrefix) => {
    const pathKeys = Object.keys(obj.paths);
    pathKeys.forEach(key => {
        obj.paths[key.replace(stripPrefix, prependPrefix)] = obj.paths[key];
        delete obj.paths[key];
    });
};

const applyRules = (obj, rules) => {
    rules.forEach(rule => {
        if (rule.name === 'modifyRefPrefix') {
            modifyRefPrefix(obj, rule.stripPrefix, rule.prependPrefix);
        } else if (rule.name === 'modifyPathPrefix') {
            modifyPathPrefix(obj, rule.stripPrefix, rule.prependPrefix);
        }
    });
};

module.exports = function () {
    const config = YAML.parse(fs.readFileSync('./configuration.yaml', 'UTF-8'));

    const objects = [];

    config.inputs.forEach(input => {
        const openapiObj = YAML.parse(fs.readFileSync(input.inputFile, 'UTF-8'));

        dropKeys(
            openapiObj,
            Object.keys(openapiObj).filter(key => !input.keys.includes(key)),
        );

        if (input.rules) applyRules(openapiObj, input.rules);

        objects.push(openapiObj);
    });

    const merged = merge.all(objects);

    const output = new YAML.Document();
    output.contents = merged;

    fs.writeFileSync(config.outputFilename, output.toString());
};
