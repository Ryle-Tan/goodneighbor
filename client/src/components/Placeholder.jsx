// Temporary page so every route works before the real page is built.
// Replace it with your real page in App.jsx, then this can be deleted when no route uses it.
export default function Placeholder({ name, owner }) {
  return (
    <div style={{ padding: 40 }}>
      <h1>{name}</h1>
      <p>Not built yet. Owner: {owner}</p>
    </div>
  )
}
