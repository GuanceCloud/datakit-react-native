module.exports = {
  dependencies: {
    'react-native-config': {
      platforms: {
        // RN 0.76 new architecture may incorrectly treat this package as a
        // codegen/CMake dependency on Android. We keep Android integration
        // manual to avoid autolinking-generated JNI build errors.
        android: null,
      },
    },
  },
};
