#!/usr/bin/env node

// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
const { readFileSync, writeFileSync } = require('fs');
const GET_JSX_RUNTIME_RELATIVE_PATH =
    'rum/FTRumActionTracking';

const isJsxExportedInReactVersion = (major, minor) => {
    if (Number(major) > 16) {
        return true;
    }
    if (Number(major) === 16 && Number(minor) > 13) {
        return true;
    }
    return false;
};
const replaceReactJsxRequire = () => {
    process.stdout.write('[FTLog] replacing react/jsx-runtime by react\n');
    const actionFilePath = `${__dirname}/..`;
    const locations = [
        { directory: `${actionFilePath}/src`, extension: 'tsx' },
        { directory: `${actionFilePath}/lib/commonjs`, extension: 'js' },
        { directory: `${actionFilePath}/lib/commonjs`, extension: 'js.map' },
        { directory: `${actionFilePath}/lib/module`, extension: 'js' },
        { directory: `${actionFilePath}/lib/module`, extension: 'js.map' }
    ];

    locations.forEach(location => {
        const fileLocation = `${location.directory}/${GET_JSX_RUNTIME_RELATIVE_PATH}.${location.extension}`;
        const file = readFileSync(fileLocation).toString();
        writeFileSync(
            fileLocation,
            file.replace("require('react/jsx-runtime')", "require('react')")
        );
    });
};

try {
    // Get React version
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const [major, minor] = require('react/package.json').version.split('.');
    process.stdout.write(`[FTLog] found react version ${major}${minor}\n`);

    if (!isJsxExportedInReactVersion(major, minor)) {
        replaceReactJsxRequire();
    }
    process.stdout.write('[FTLog] postinstall replace-react-require end\n');
} catch (error) {
    process.stderr.write(
        `[FTLog] Error running replace-react-require: ${error}\n`
    );
}