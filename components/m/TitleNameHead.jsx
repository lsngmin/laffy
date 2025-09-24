import Head from "next/head";

export default function TitleNameHead({ title, description }) {
  const fullTitle = title ? `${title} | Laffy` : "Laffy";

  return (
    <Head>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
    </Head>
  );
}
