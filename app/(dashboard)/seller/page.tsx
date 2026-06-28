import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import ChartComponent from "@/components/DashboardComponents/ChartComponent";
import DashboardCard from "@/components/DashboardComponents/DashboardCard";
import Image from "next/image";
import Orderlist from "@/components/DashboardComponents/Orderlist";

const SellerDashboard = () => {
 
  return (
    <div className="px-4 py-6 space-y-6">
      <DashboardCard />
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="w-full lg:w-7/12 bg-[#283046]">
          <CardContent>
            <ChartComponent />
          </CardContent>
        </Card>
        <Card className="w-full lg:w-5/12 lg:pl-4 bg-[#283046] text-[#d0d2d6] mt-6 lg:mt-0">
          <CardContent>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Recent Seller Message</h2>
              <Link href="#" className="text-sm font-medium">
                View All
              </Link>
            </div>
            <div className="flex flex-col gap-2 pt-6 text-[#d0d2d6]">
              <ol className="m-4 relative rounded-md p-4 border-1 border-slate-600">
                <li className="ml-6 mb-3">
                  <div className="flex absolute left-2 w-10 h-10 shadow-lg justify-center  rounded-full items-center p-[6px] z-10 bg-[#00d1e848]">
                    <Image
                      src="/images/seller.png"
                      alt="avatar"
                      fill
                      className="w-full h-full shadow-lg  rounded-full"
                    />
                  </div>
                  <div className="ml-4 bg-slate-800 p-3 rounded-lg border border-slate-600">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">alone king</span>
                      <span className="text-xs">12/05/2025</span>
                    </div>
                    <div className="mt-2 text-xs bg-slate-700 p-2 rounded">
                      hello
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
      <Orderlist />
    </div>
  );
};

export default SellerDashboard;
