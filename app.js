// A simple function to replicate the logic of date-fns format.
function formatDate(date, formatStr) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const minute = d.getMinutes();
    const second = d.getSeconds();
    
    let result = formatStr
        .replace('yyyy', year)
        .replace('MM', month.toString().padStart(2, '0'))
        .replace('dd', day.toString().padStart(2, '0'))
        .replace('HH', hour.toString().padStart(2, '0'))
        .replace('mm', minute.toString().padStart(2, '0'))
        .replace('ss', second.toString().padStart(2, '0'))
        .replace('MMM', d.toLocaleString('default', { month: 'short' }))
        .replace('d', day);

    return result;
}

// A simple function to create an SVG icon
function createIcon(dPath) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${dPath}"></path></svg>`;
}

// Mock Database
const mockDb = {
    licenses: [
        { id: 'l1', license_number: 'GA123456789', full_name: 'John Doe', status: 'active', license_class: 'B', issue_date: '2023-01-01', expiry_date: '2028-01-01', issuing_office: 'Libreville' },
        { id: 'l2', license_number: 'GA987654321', full_name: 'Jane Smith', status: 'expired', license_class: 'A', issue_date: '2015-05-10', expiry_date: '2020-05-10', issuing_office: 'Port-Gentil' },
        { id: 'l3', license_number: 'GA112233445', full_name: 'Peter Jones', status: 'active', license_class: 'C', issue_date: '2024-03-15', expiry_date: '2029-03-15', issuing_office: 'Franceville' },
        { id: 'l4', license_number: 'GA556677889', full_name: 'Mary White', status: 'suspended', license_class: 'D', issue_date: '2022-09-20', expiry_date: '2027-09-20', issuing_office: 'Oyem' },
        { id: 'l5', license_number: 'GA135792468', full_name: 'David Green', status: 'active', license_class: 'E', issue_date: '2021-11-05', expiry_date: '2026-11-05', issuing_office: 'Moanda' },
    ],
    verificationRequests: [
        { id: 'v1', license_number: 'GA123456789', requesting_entity: 'Customs Agency', requesting_country: 'France', verification_result: 'verified', created_date: new Date('2025-09-05T10:00:00').toISOString() },
        { id: 'v2', license_number: 'GA987654321', requesting_entity: 'Border Control', requesting_country: 'Germany', verification_result: 'expired', created_date: new Date('2025-09-04T15:30:00').toISOString() },
        { id: 'v3', license_number: 'GA556677889', requesting_entity: 'Local Police', requesting_country: 'Gabon', verification_result: 'invalid', created_date: new Date('2025-09-03T09:12:00').toISOString() },
        { id: 'v4', license_number: 'GA111111111', requesting_entity: 'Interpol', requesting_country: 'USA', verification_result: 'not_found', created_date: new Date('2025-09-05T11:45:00').toISOString() },
    ]
};

// Mock API layer
const API = {
    License: {
        async list() { return mockDb.licenses; },
        async filter({ license_number }) {
            return mockDb.licenses.filter(l => l.license_number === license_number);
        }
    },
    VerificationRequest: {
        async list() { return mockDb.verificationRequests; },
        async create(data) {
            const newId = 'v' + (mockDb.verificationRequests.length + 1);
            const newRequest = { id: newId, ...data, created_date: new Date().toISOString() };
            mockDb.verificationRequests.unshift(newRequest);
            return newRequest;
        }
    }
};

// The application state and rendering logic
function App() {
    const rootElement = document.getElementById('root');
    let activePage = 'dashboard';
    const state = {
        licenses: [],
        verifications: [],
        isLoading: true,
        searchData: {
            license_number: '',
            requesting_entity: '',
            requesting_country: '',
            contact_email: '',
            purpose: ''
        },
        verificationResult: null,
        isSearching: false,
        error: null
    };

    function setState(newState) {
        Object.assign(state, newState);
        render();
    }

    function render() {
        if (activePage === 'dashboard') {
            Dashboard();
        } else if (activePage === 'verificationPortal') {
            VerificationPortal();
        } else if (activePage === 'licenseManagement') {
            LicenseManagement();
        }
    }

    async function loadData() {
        setState({ isLoading: true });
        try {
            const [licensesData, verificationsData] = await Promise.all([
                API.License.list(),
                API.VerificationRequest.list()
            ]);
            setState({
                licenses: licensesData,
                verifications: verificationsData,
                isLoading: false
            });
        } catch (e) {
            console.error(e);
            setState({ isLoading: false });
        }
    }

    // --- Dashboard Component ---
    function Dashboard() {
        const activeLicenses = state.licenses.filter(l => l.status === 'active').length;
        const expiredLicenses = state.licenses.filter(l => l.status === 'expired').length;
        const todayVerifications = state.verifications.filter(v => formatDate(v.created_date, 'yyyy-MM-dd') === formatDate(new Date(), 'yyyy-MM-dd')).length;
        const successfulVerifications = state.verifications.filter(v => v.verification_result === 'verified').length;
        const successRate = state.verifications.length > 0 ? ((successfulVerifications / state.verifications.length) * 100).toFixed(1) : 0;

        rootElement.innerHTML = `
            <div class="max-w-7xl mx-auto p-6 space-y-8">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-slate-900">System Dashboard</h1>
                        <p class="text-slate-600 mt-1">Gabon Driver's License Verification System</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    ${StatsCard('Total Licenses', state.licenses.length.toLocaleString(), createIcon('M18 5V3a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2'), 'from-blue-500 to-blue-600', '+12 this week', 'up')}
                    ${StatsCard('Active Licenses', activeLicenses.toLocaleString(), createIcon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'), 'from-green-500 to-green-600', `${activeLicenses} active`, 'stable')}
                    ${StatsCard('Today\'s Verifications', todayVerifications.toLocaleString(), createIcon('M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1c0-1.55-1.1-2.85-2.5-3.16M15 15l-4-4L9 13l-2-2'), 'from-purple-500 to-purple-600', '+8 from yesterday', 'up')}
                    ${StatsCard('Success Rate', `${successRate}%`, createIcon('m22 7-8.25 8.25-5.5-5.5L2 18'), 'from-orange-500 to-orange-600', '98.5% average', 'up')}
                </div>

                <div class="grid lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 space-y-6">
                        ${RecentVerifications(state.verifications)}

                        <div class="card shadow-lg">
                            <div class="card-header">
                                <h3 class="card-title text-xl">Quick Actions</h3>
                            </div>
                            <div class="card-content">
                                <div class="grid md:grid-cols-2 gap-4">
                                    <div class="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                                        <div class="flex items-center gap-3 mb-2">
                                            ${createIcon('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2')}<span class="font-semibold text-blue-900">License Management</span>
                                        </div>
                                        <p class="text-sm text-blue-700">Add, edit, or manage driver's licenses</p>
                                    </div>
                                    <div class="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                                        <div class="flex items-center gap-3 mb-2">
                                            ${createIcon('M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm4-12.7L8.7 16l-.7-.7L15.3 4z')}<span class="font-semibold text-purple-900">International Portal</span>
                                        </div>
                                        <p class="text-sm text-purple-700">Access verification portal for authorities</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                        ${SystemHealth(state.licenses.length, activeLicenses, expiredLicenses, state.verifications)}
                    </div>
                </div>
            </div>
        `;
    }

    function StatsCard(title, value, icon, bgColor, change, trend) {
        const getTrendIcon = (trend) => {
            switch(trend) {
                case 'up': return createIcon('M12 5l-7 7 7 7 7-7-7-7z'); // Simplified up arrow
                default: return '';
            }
        };
        const getTrendColor = (trend) => {
            switch(trend) {
                case 'up': return 'text-green-600';
                default: return 'text-slate-500';
            }
        };

        return `
            <div class="card shadow-lg p-6">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-3 rounded-xl bg-gradient-to-br ${bgColor} bg-opacity-20">${icon}</div>
                    ${getTrendIcon(trend)}
                </div>
                <div>
                    <h3 class="text-sm font-medium text-slate-600 mb-1">${title}</h3>
                    <p class="text-3xl font-bold text-slate-900 mb-2">${value}</p>
                    ${change ? `<p class="text-sm font-medium ${getTrendColor(trend)}">${change}</p>` : ''}
                </div>
            </div>
        `;
    }

    function RecentVerifications(verifications) {
        const recentVerifications = verifications.slice(0, 5);
        const getStatusIcon = (result) => {
            switch(result) {
                case 'verified': return createIcon('M9 12.75L11.25 15L15 9.75M12 21.75c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9z');
                case 'not_found': return createIcon('M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm3.5-12.5L12 12.5 8.5 9 12 5.5 15.5 9z');
                case 'expired': return createIcon('M10.29 3.86a2 2 0 0 1 3.42 0L21 16.5a2 2 0 0 1-1.72 3.0H4.72a2 2 0 0 1-1.72-3.0z');
                default: return createIcon('M12 8v4l3 3m6-4a9 9 0 1 0-9 9 9 9 0 0 0 9-9z');
            }
        };
        const getStatusBadge = (result) => {
            const styles = {
                verified: "badge-verified",
                not_found: "badge-not-found",
                expired: "badge-expired",
                invalid: "badge-not-found"
            };
            return `<span class="badge badge-outline ${styles[result]}">${getStatusIcon(result)}<span class="ml-1 capitalize">${result.replace('_', ' ')}</span></span>`;
        };

        return `
            <div class="card shadow-lg">
                <div class="card-header">
                    <h3 class="card-title text-xl">Recent Verification Requests</h3>
                </div>
                <div class="card-content">
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b border-slate-200">
                                    <th class="text-left font-semibold text-slate-700 py-2">License Number</th>
                                    <th class="text-left font-semibold text-slate-700 py-2">Requesting Entity</th>
                                    <th class="text-left font-semibold text-slate-700 py-2">Status</th>
                                    <th class="text-left font-semibold text-slate-700 py-2">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentVerifications.map(v => `
                                    <tr class="hover:bg-slate-50 transition-colors">
                                        <td class="py-2 text-sm">${v.license_number}</td>
                                        <td class="py-2 text-sm">${v.requesting_entity}</td>
                                        <td class="py-2 text-sm">${getStatusBadge(v.verification_result)}</td>
                                        <td class="py-2 text-sm text-slate-600">${formatDate(v.created_date, 'MMM d, HH:mm')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    function SystemHealth(totalLicenses, activeLicenses, expiredLicenses, verifications) {
        const activePercentage = totalLicenses > 0 ? (activeLicenses / totalLicenses) * 100 : 0;
        const successfulVerifications = verifications.filter(v => v.verification_result === 'verified').length;
        const successRate = verifications.length > 0 ? (successfulVerifications / verifications.length) * 100 : 100;

        return `
            <div class="card shadow-lg">
                <div class="card-header">
                    <h3 class="card-title text-xl">System Health</h3>
                </div>
                <div class="card-content space-y-6">
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                ${createIcon('M2 3a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z')}
                                <span class="text-sm font-medium text-slate-700">Active Licenses</span>
                            </div>
                            <span class="text-sm font-semibold text-slate-900">${activePercentage.toFixed(1)}%</span>
                        </div>
                        <div class="progress"><div class="progress-bar bg-blue-500" style="width: ${activePercentage}%;"></div></div>
                    </div>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                ${createIcon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')}
                                <span class="text-sm font-medium text-slate-700">Verification Success</span>
                            </div>
                            <span class="text-sm font-semibold text-slate-900">${successRate.toFixed(1)}%</span>
                        </div>
                        <div class="progress"><div class="progress-bar bg-green-500" style="width: ${successRate}%;"></div></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Main function call to start the app
    loadData().then(() => Dashboard());
}

document.addEventListener('DOMContentLoaded', App);