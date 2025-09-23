import Head from "next/head";

export default function SlugPage({ slug }) {
    return (
        <>
            <Head>
                <title>{slug} | Site</title>
                <meta name="robots" content="index,follow" />
            </Head>

            <main style={styles.wrap}>
                <img src="/logo.svg" alt="Logo" width={128} height={128} />
            </main>
        </>
    );
}

// 빌드 후 첫 요청 때 정적으로 생성 (SSG) - 특정 슬러그만 미리 만들려면 paths에 넣으세요.
export async function getStaticPaths() {
    return {
        paths: [],           // 예: [{ params: { slug: "about" } }, { params: { slug: "help" } }]
        fallback: "blocking" // 첫 요청 시 생성 → 이후 캐시 사용
    };
}

export async function getStaticProps({ params }) {
    return {
        props: { slug: params.slug },
        revalidate: 60 * 60 // (선택) 1시간마다 ISR 갱신
    };
}

const styles = {
    wrap: {
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "white",
    },
};
