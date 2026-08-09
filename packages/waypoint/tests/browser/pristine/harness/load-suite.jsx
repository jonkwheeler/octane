/**
 * Loads the byte-exact upstream Karma browser suite against the vendored React
 * binding. A scoped resolveId maps this file's bare `react-dom` import to the
 * React 19 legacy shim; the suite source is not transformed.
 */
import '../../../../upstream/test/browser/waypoint_test.jsx';
