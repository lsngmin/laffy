function renderCanonicalElements({ canonicalUrl, hreflangs, jsonLd }) {
    const elements = [];

    if (typeof canonicalUrl === "string" && canonicalUrl) {
        elements.push(<link key="canonical" rel="canonical" href={canonicalUrl} />);
    }

    if (Array.isArray(hreflangs)) {
        hreflangs.forEach((alt) => {
            if (!alt || typeof alt !== "object") return;
            const hrefLang = typeof alt.hrefLang === "string" ? alt.hrefLang : null;
            const href = typeof alt.href === "string" ? alt.href : null;
            if (!hrefLang || !href) return;
            elements.push(
                <link key={`hreflang:${hrefLang}:${href}`} rel="alternate" hrefLang={hrefLang} href={href} />
            );
        });
    }

    if (jsonLd) {
        try {
            const serialized = JSON.stringify(jsonLd);
            elements.push(
                <script
                    key="jsonld"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: serialized }}
                />
            );
        } catch {
            // ignore serialization issues
        }
    }

    return elements;
}

export { renderCanonicalElements };
