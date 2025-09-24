import dynamic from 'next/dynamic';

const BannerFrame = dynamic(() => import('./RelishAtOptionsFrame'), { ssr: false });

export default function QuadAdGrid() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex items-center justify-center">
        <BannerFrame width={300} height={250} />
      </div>
      <div className="flex items-center justify-center">
        <BannerFrame width={300} height={250} />
      </div>
      <div className="flex items-center justify-center">
        <BannerFrame width={300} height={250} />
      </div>
      <div className="flex items-center justify-center">
        <BannerFrame width={300} height={250} />
      </div>
    </div>
  );
}

