/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

function getReactNativeVersion() {
  try {
    // eslint-disable-next-line global-require
    return require('react-native/package.json').version;
  } catch (error) {
    throw new Error(
      'Failed to find React Native. Ensure it is installed in your project.'
    );
  }
}

const rnVersion = getReactNativeVersion();

const outputDir = path.resolve(__dirname, '../ios');
const outputFile = path.join(outputDir, 'RCTVersion.h');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const [major, minor, patch] = rnVersion.split('.').map(Number);

const headerContent = `#ifndef RCTVersion_h
#define RCTVersion_h

#define RCT_VERSION_MAJOR ${major || 0}
#define RCT_VERSION_MINOR ${minor || 0}
#define RCT_VERSION_PATCH ${patch || 0}

#endif /* RCTVersion_h */
`;

try {
  fs.writeFileSync(outputFile, headerContent, 'utf8');
} catch (error) {
  console.error(`Failed to write RCTVersion.h: ${error.message}`);
  process.exit(1);
}
