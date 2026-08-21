// components/JsonLd.tsx
// Renders one or more schema.org JSON-LD objects as a <script> tag.
export default function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data);
  return (
    <script
      type="application/ld+json"
      // Safe: `data` is built server-side from our own structured values.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
