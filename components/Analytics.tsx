
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import { PROJECTS } from '../constants';

const crewPerformanceData = [
  { subject: 'Speed', A: 120, B: 110, fullMark: 150 },
  { subject: 'Quality', A: 98, B: 130, fullMark: 150 },
  { subject: 'Safety', A: 86, B: 130, fullMark: 150 },
  { subject: 'Budget', A: 99, B: 100, fullMark: 150 },
  { subject: 'Client Satisfaction', A: 85, B: 90, fullMark: 150 },
];

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
        <Card>
            <CardHeader className="flex justify-between items-center">
                <CardTitle>Analytics & Reports</CardTitle>
                <div className="space-x-2">
                    {/* TODO: Implement export functionality */}
                    <Button variant="secondary">Export to CSV</Button>
                    <Button variant="secondary">Download as PDF</Button>
                </div>
            </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader><CardTitle>Profit by Project</CardTitle></CardHeader>
                <CardContent className="h-80">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={PROJECTS} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(100, 116, 139, 0.3)" />
                            <XAxis type="number" stroke="rgb(100 116 139)" />
                            <YAxis type="category" dataKey="client" width={100} stroke="rgb(100 116 139)" />
                            <Tooltip formatter={(value: number) => `$${(value).toLocaleString()}`} cursor={{fill: 'rgba(100, 116, 139, 0.1)'}}/>
                            <Legend />
                            <Bar dataKey="budget" name="Budget" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="actual" name="Actual" stackId="a" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Top Performing Crews</CardTitle></CardHeader>
                <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                       <RadarChart cx="50%" cy="50%" outerRadius="80%" data={crewPerformanceData}>
                          <PolarGrid stroke="rgba(100, 116, 139, 0.3)"/>
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis />
                          <Radar name="Crew Alpha" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                          <Radar name="Crew Bravo" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                          <Legend />
                           <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default Analytics;
