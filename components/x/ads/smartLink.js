import { SPONSOR_SMART_LINK_URL } from "./constants";

function openSmartLink(windowRef = typeof window !== "undefined" ? window : null) {
    if (!windowRef) return;

    try {
        windowRef.location.href = SPONSOR_SMART_LINK_URL;
    } catch {
        // ignore navigation issues
    }
}

export { openSmartLink };
