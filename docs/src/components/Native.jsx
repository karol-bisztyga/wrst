// Two pill labels showing which native widget a wrst component renders to on each
// platform. Wear OS badges share one border color, Apple Watch badges another.
const WEAR_COLOR = '#3ddc84' // Android / Wear OS green
const APPLE_COLOR = '#2997ff' // Apple blue

const badge = color => ({
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 6,
  border: `1px solid ${color}`,
  borderRadius: 7,
  padding: '2px 10px',
  fontSize: 12.5,
  lineHeight: 1.5,
  marginRight: 8,
  marginBottom: 6,
  whiteSpace: 'nowrap'
})

const platform = color => ({
  color,
  fontWeight: 700,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.03em'
})

const widget = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontWeight: 600
}

export function Native({ wear, apple }) {
  return (
    <div style={{ margin: '10px 0 4px', display: 'flex', flexWrap: 'wrap' }}>
      {wear ? (
        <span style={badge(WEAR_COLOR)}>
          <span style={platform(WEAR_COLOR)}>Wear OS</span>
          <span style={widget}>{wear}</span>
        </span>
      ) : null}
      {apple ? (
        <span style={badge(APPLE_COLOR)}>
          <span style={platform(APPLE_COLOR)}>Apple Watch</span>
          <span style={widget}>{apple}</span>
        </span>
      ) : null}
    </div>
  )
}
