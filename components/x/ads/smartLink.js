const SMART_LINK_URL = "https://relishsubsequentlytank.com/m4dat49uw?key=5c0b078a04533db894c7b305e5dd7a67";

function openSmartLink(windowRef = typeof window !== "undefined" ? window : null) {
    if (!windowRef) return;

    try {
        windowRef.location.href = SMART_LINK_URL;
    } catch {
        // ignore navigation issues
    }
}

export { openSmartLink, SMART_LINK_URL };
