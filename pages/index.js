export default function Landing() {
  return null;
}

export function getServerSideProps() {
  return {
    redirect: {
      destination: '/m',
      permanent: false,
    },
  };
}
