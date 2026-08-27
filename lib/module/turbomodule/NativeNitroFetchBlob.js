"use strict";

import { TurboModuleRegistry } from 'react-native';

// Tiny TurboModule whose only job is to reach RN's native BlobModule from a place
// RN decorates with `moduleRegistry` — so we don't have to patch nitro-modules.

export default TurboModuleRegistry.get('NitroFetchBlob');
//# sourceMappingURL=NativeNitroFetchBlob.js.map