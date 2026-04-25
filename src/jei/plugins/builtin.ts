import type { JeiPluginDefinition } from './types';
import { externalLinkPlugin } from './internal/externalLink';
import { catalogApiPlugin } from './internal/catalogApi';
import { iframeBridgePlugin } from './internal/iframeBridge';
import { protocolTerminalPlugin } from './internal/protocolTerminal';
import { bilibiliWikiPlugin } from './internal/bilibiliWiki';
import { endfieldPlannerPlugin } from './internal/endfieldPlanner';
import { endfieldBlueprintsPlugin } from './internal/endfieldBlueprints';

export const builtinPlugins: JeiPluginDefinition[] = [
  externalLinkPlugin,
  catalogApiPlugin,
  iframeBridgePlugin,
  protocolTerminalPlugin,
  bilibiliWikiPlugin,
  endfieldPlannerPlugin,
  endfieldBlueprintsPlugin,
];
