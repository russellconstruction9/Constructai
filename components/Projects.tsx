import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { PROJECTS, USERS } from '../constants';
import { Project } from '../types';
import { useCurrentUser } from '../hooks/useCurrentUser';

const ProjectStatusBadge: React.FC<{ status: Project['status'] }> = ({ status }) => {
    const statusClasses = {
        'Planning': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'On Hold': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status]}`}>
            {status}
        </span>
    );
}

const Projects: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projects, setProjects] = useState<Project[]>(PROJECTS);
    const [newProjectData, setNewProjectData] = useState({
        client: '',
        address: '',
        budget: '',
    });
    const navigate = useNavigate();
    const { user } = useCurrentUser();
    const canEdit = user?.permissions.projects === 'edit';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setNewProjectData(prev => ({ ...prev, [id]: value }));
    };

    const handleNewProject = () => {
        if (!canEdit) return;
        if (!newProjectData.client || !newProjectData.address || !newProjectData.budget) {
            alert('Please fill out all fields.');
            return;
        }

        const newProject: Project = {
            id: projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1,
            client: newProjectData.client,
            address: newProjectData.address,
            status: 'Planning',
            budget: parseFloat(newProjectData.budget),
            actual: 0,
            margin: 0,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
            activity: [{ date: new Date().toISOString().split('T')[0], description: 'Project created.' }],
        };

        setProjects(prevProjects => [...prevProjects, newProject]);
        setNewProjectData({ client: '', address: '', budget: '' }); // Reset form
        setIsModalOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <CardTitle>All Projects</CardTitle>
                    <Button onClick={() => setIsModalOpen(true)} disabled={!canEdit} title={!canEdit ? "You don't have permission to add projects" : ""}>
                        + New Project
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Client</th>
                                    <th scope="col" className="px-6 py-3">Address</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right">Budget</th>
                                    <th scope="col" className="px-6 py-3 text-right">Actual</th>
                                    <th scope="col" className="px-6 py-3 text-right">Margin %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map((project) => (
                                    <tr 
                                        key={project.id} 
                                        className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer"
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">{project.client}</td>
                                        <td className="px-6 py-4">{project.address}</td>
                                        <td className="px-6 py-4"><ProjectStatusBadge status={project.status} /></td>
                                        <td className="px-6 py-4 text-right">${project.budget.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">${project.actual.toLocaleString()}</td>
                                        <td className={`px-6 py-4 text-right font-medium ${project.margin > 0 ? 'text-green-500' : 'text-red-500'}`}>{project.margin.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {projects.map((project) => (
                             <div 
                                key={project.id} 
                                className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 border border-slate-200 dark:border-slate-700"
                                onClick={() => navigate(`/projects/${project.id}`)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200">{project.client}</p>
                                        <p className="text-sm text-slate-500">{project.address}</p>
                                    </div>
                                    <ProjectStatusBadge status={project.status} />
                                </div>
                                <div className="mt-4 pt-4 border-t dark:border-slate-700 flex justify-between text-sm">
                                    <div>
                                        <p className="text-slate-500">Budget</p>
                                        <p>${project.budget.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Actual</p>
                                        <p>${project.actual.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Margin</p>
                                        <p className={`font-medium ${project.margin > 0 ? 'text-green-500' : 'text-red-500'}`}>{project.margin.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Project">
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleNewProject(); }}>
                    <div>
                        <label htmlFor="client" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Client Name</label>
                        <input type="text" id="client" value={newProjectData.client} onChange={handleInputChange} className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" placeholder="John Doe" required />
                    </div>
                     <div>
                        <label htmlFor="address" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Project Address</label>
                        <input type="text" id="address" value={newProjectData.address} onChange={handleInputChange} className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" placeholder="123 Main St" required />
                    </div>
                     <div>
                        <label htmlFor="budget" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Initial Budget</label>
                        <input type="number" id="budget" value={newProjectData.budget} onChange={handleInputChange} className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white" placeholder="100000" required />
                    </div>
                    <div>
                         <label htmlFor="pm" className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Project Manager</label>
                         <select id="pm" className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white">
                            {USERS.filter(u => u.role === 'Employee' && u.permissions.projects === 'edit').map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                         </select>
                    </div>
                    <div className="flex justify-end pt-4">
                       <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="mr-2">Cancel</Button>
                       <Button type="submit">Create Project</Button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default Projects;
