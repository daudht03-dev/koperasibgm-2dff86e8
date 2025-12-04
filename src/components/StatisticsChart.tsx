import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Tables } from "@/integrations/supabase/types";

type Land = Tables<"lahan">;
type Farmer = Tables<"petani">;
type Harvest = Tables<"panen">;

interface StatisticsChartProps {
  lands: Land[];
  farmers: Farmer[];
  harvests: Harvest[];
}

export const StatisticsChart = ({ lands, farmers, harvests }: StatisticsChartProps) => {
  // Calculate productivity per land
  const productivityData = lands.map(land => {
    const landHarvests = harvests.filter(h => h.lahan_id === land.id);
    const totalKg = landHarvests.reduce((sum, h) => sum + Number(h.jumlah_kg), 0);
    const farmer = land.petani_id ? farmers.find(f => f.id === land.petani_id) : null;
    
    return {
      name: land.nama_lahan,
      total: totalKg,
      count: landHarvests.length,
      petani: farmer?.nama || "Tidak ada",
    };
  }).filter(d => d.total > 0);

  // Calculate monthly harvest trend (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthStr = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short' });
    
    const monthHarvests = harvests.filter(h => {
      const harvestDate = new Date(h.tanggal_panen);
      return harvestDate.getMonth() === date.getMonth() && 
             harvestDate.getFullYear() === date.getFullYear();
    });
    
    const total = monthHarvests.reduce((sum, h) => sum + Number(h.jumlah_kg), 0);
    
    return {
      month: monthStr,
      total,
      count: monthHarvests.length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Productivity per Land */}
      <Card className="shadow-gentle border-border/50">
        <CardHeader>
          <CardTitle>Produktivitas per Lahan</CardTitle>
          <CardDescription>Total hasil panen (kg) untuk setiap lahan</CardDescription>
        </CardHeader>
        <CardContent>
          {productivityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm text-muted-foreground">Petani: {data.petani}</p>
                          <p className="text-sm">Total: {data.total} kg</p>
                          <p className="text-sm">Jumlah Panen: {data.count}x</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="total" fill="#8B4513" name="Total (kg)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Belum ada data panen yang tercatat</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card className="shadow-gentle border-border/50">
        <CardHeader>
          <CardTitle>Tren Panen Bulanan</CardTitle>
          <CardDescription>Total hasil panen (kg) dalam 6 bulan terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold">{data.month}</p>
                        <p className="text-sm">Total: {data.total} kg</p>
                        <p className="text-sm">Jumlah Panen: {data.count}x</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#8B4513" name="Total (kg)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
