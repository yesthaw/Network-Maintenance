// ==================== DATA MAINTENANCE PAGE ====================
// File ini berisi HTML template + logika tabel Data Maintenance
// Edit file ini untuk mengubah tampilan & fitur tabel

const DataMaintenancePage = {

    // ==================== HTML TEMPLATE ====================
    html: `
        <div class="table-section">
            <div class="table-header">
                <h3><i class="fas fa-database" style="color:var(--primary);margin-right:8px"></i>Data Maintenance Jaringan</h3>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="TambahLaporan.openAddModal()"><i class="fas fa-plus"></i> Tambah</button>
                    <button class="btn btn-success" onclick="DataMaintenancePage.exportExcel()"><i class="fas fa-file-excel"></i> Excel</button>
                    <button class="btn btn-danger" onclick="DataMaintenancePage.exportPDF()"><i class="fas fa-file-pdf"></i> PDF</button>
                </div>
            </div>

            <!-- FILTER BAR -->
            <div class="filter-bar">
                <div class="search-input">
                    <i class="fas fa-search"></i>
                    <input type="text" id="searchInput" placeholder="Cari deskripsi / keterangan, lokasi, teknisi..." onkeyup="DataMaintenancePage.render()">
                </div>
                <input type="date" class="filter-date" id="filterDate" onchange="DataMaintenancePage.render()">
                <select class="filter-select" id="filterStatus" onchange="DataMaintenancePage.render()"></select>
                <select class="filter-select" id="filterCategory" onchange="DataMaintenancePage.render()"></select>
                <select class="filter-select" id="filterPriority" onchange="DataMaintenancePage.render()"></select>
            </div>

            <!-- TABEL -->
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Tanggal</th>
                            <th>Lokasi</th>
                            <th>Pemeriksaan</th>
                            <th>Deskripsi / Keterangan</th>
                            <th>Penanganan</th>
                            <th>Teknisi</th>
                            <th>Item</th>
                            <th>Status</th>
                            <th>Durasi</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="dataTableBody"></tbody>
                </table>
            </div>

            <!-- PAGINATION -->
            <div class="table-pagination">
                <div class="pagination-info" id="paginationInfo">Menampilkan 0 data</div>
                <div class="pagination-btns" id="paginationBtns"></div>
            </div>
        </div>
    `,

    // ==================== STATE ====================
    currentPage: 1,
    itemsPerPage: 10,

    // ==================== RENDER PAGE ====================
    renderPage: function() {
        const container = document.getElementById('page-data');
        if (container) container.innerHTML = this.html;
        // Populate filter dropdowns
        DROPDOWN.populateAll();
        // Filter tanggal default: HARI INI — untuk melihat data kemarin/hari
        // sebelumnya, cukup undur tanggalnya. (Kosongkan tanggal = semua data)
        const fd = document.getElementById('filterDate');
        if (fd && !fd.value) fd.value = localDateStr();
    },

    // ==================== GET FILTERED DATA ====================
    getFilteredData: function() {
        let data = [...maintenanceData];
        const s = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const dt = document.getElementById('filterDate')?.value || '';
        const st = document.getElementById('filterStatus')?.value || '';
        const ca = document.getElementById('filterCategory')?.value || '';
        const pr = document.getElementById('filterPriority')?.value || '';

        if (s) data = data.filter(d =>
            d.problem.toLowerCase().includes(s) ||
            d.location.toLowerCase().includes(s) ||
            d.category.toLowerCase().includes(s) ||
            d.technician.toLowerCase().includes(s)
        );
        if (dt) data = data.filter(d => d.date === dt);
        // Default halaman: "Belum Selesai" -> hanya Pending & Dalam Proses.
        // Data yang diganti Selesai otomatis keluar dari halaman; lihat kembali
        // lewat filter Status = Selesai / Semua Status.
        if (st === '__belum') data = data.filter(d => d.status === 'Pending' || d.status === 'Dalam Proses');
        else if (st) data = data.filter(d => d.status === st);
        if (ca) data = data.filter(d => d.category === ca);
        if (pr) data = data.filter(d => d.priority === pr);

        // Terurut sesuai tanggal/waktu DIBUAT (yang paling lama di atas,
        // seperti antrean pekerjaan)
        const waktuBuat = (r) => r.createdAt ? new Date(r.createdAt).getTime() : (typeof r.id === 'number' ? r.id : 0);
        return data.sort((a, b) => waktuBuat(a) - waktuBuat(b));
    },

    // ==================== RENDER TABLE ====================
    render: function() {
        const filtered = this.getFilteredData();
        const totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        if (this.currentPage > totalPages) this.currentPage = 1;
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const pageData = filtered.slice(start, start + this.itemsPerPage);
        const admin = isAdmin();

        const tbody = document.getElementById('dataTableBody');
        if (!tbody) return;

        tbody.innerHTML = pageData.length > 0 ? pageData.map((d, i) => `
            <tr>
                <td><strong>${start + i + 1}</strong></td>
                <td>${fmtDate(d.date)}<br><span style="color:var(--text-secondary);font-size:.7rem">${d.time}</span></td>
                <td>${d.location}</td>
                <td style="font-size:.76rem">${d.category}</td>
                <td style="font-size:.76rem">${d.problem.substring(0, 35)}...</td>
                <td style="font-size:.76rem">${d.solution ? d.solution.substring(0, 30) + '...' : '<em style="color:var(--text-secondary)">-</em>'}</td>
                <td style="font-size:.76rem">${d.technician}</td>
                <td>${priBadge(d.priority)}</td>
                <td>${statBadge(d.status)}</td>
                <td style="font-size:.76rem">${formatDurasi(d)}</td>
                <td>
                    <div style="display:flex;gap:4px">
                        ${admin ? `<button class="btn btn-primary btn-sm btn-icon" onclick="editData(${d.id})"><i class="fas fa-pen"></i></button>
                        <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDelete('data',${d.id})"><i class="fas fa-trash"></i></button>`
                        : (currentUser && d.createdBy === currentUser.username
                            ? `<button class="btn btn-primary btn-sm btn-icon" onclick="editData(${d.id})" title="Edit data milik Anda (hapus hanya oleh admin)"><i class="fas fa-pen"></i></button>`
                            : '-')}
                    </div>
                </td>
            </tr>
        `).join('') : `<tr><td colspan="11"><div class="empty-state"><i class="fas fa-inbox"></i><h3>Tidak ada data</h3><p>Tidak ditemukan data yang sesuai filter</p><p style="font-size:.72rem;color:var(--text-secondary)">Filter default: tanggal hari ini + status Belum Selesai.<br>Ubah filter Tanggal / Status (mis. "Semua Status") untuk melihat data lain.</p></div></td></tr>`;

        // Pagination info
        document.getElementById('paginationInfo').textContent = `Menampilkan ${pageData.length} dari ${filtered.length} data`;

        // Pagination buttons
        let phtml = `<button class="page-btn" onclick="DataMaintenancePage.goPage(${this.currentPage - 1})" ${this.currentPage <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            phtml += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="DataMaintenancePage.goPage(${i})">${i}</button>`;
        }
        phtml += `<button class="page-btn" onclick="DataMaintenancePage.goPage(${this.currentPage + 1})" ${this.currentPage >= totalPages || !totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
        document.getElementById('paginationBtns').innerHTML = phtml;
    },

    // ==================== GO PAGE ====================
    goPage: function(p) {
        this.currentPage = p;
        this.render();
    },

    // ==================== EXPORT EXCEL ====================
    exportExcel: function() {
        const data = this.getFilteredData();
        const ws = [['No', 'Tanggal', 'Waktu', 'Lokasi', 'Pemeriksaan', 'Deskripsi / Keterangan', 'Penanganan', 'Teknisi', 'Item', 'Status']];
        data.forEach((d, i) => ws.push([i + 1, d.date, d.time, d.location, d.category, d.problem, d.solution || '-', d.technician, d.priority, d.status]));
        const w = XLSX.utils.aoa_to_sheet(ws);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, w, 'Maintenance');
        XLSX.writeFile(wb, 'Laporan_Maintenance.xlsx');
        showToast('Excel diunduh!');
    },

    // ==================== EXPORT PDF ====================
    exportPDF: function() {
        const data = this.getFilteredData();
        let h = `<div style="font-family:Arial;padding:20px">
            <h2 style="text-align:center;color:#0f172a;margin-bottom:4px">LAPORAN MAINTENANCE JARINGAN</h2>
            <p style="text-align:center;color:#64748b;font-size:11px;margin-bottom:20px">${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} oleh ${currentUser.fullname}</p>
            <table style="width:100%;border-collapse:collapse;font-size:10px">
            <thead><tr style="background:#6366f1;color:#fff">
                <th style="padding:7px;border:1px solid #ddd">No</th>
                <th style="padding:7px;border:1px solid #ddd">Tanggal</th>
                <th style="padding:7px;border:1px solid #ddd">Lokasi</th>
                <th style="padding:7px;border:1px solid #ddd">Deskripsi / Keterangan</th>
                <th style="padding:7px;border:1px solid #ddd">Penanganan</th>
                <th style="padding:7px;border:1px solid #ddd">Teknisi</th>
                <th style="padding:7px;border:1px solid #ddd">Item</th>
                <th style="padding:7px;border:1px solid #ddd">Status</th>
            </tr></thead><tbody>`;

        data.forEach((d, i) => {
            h += `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
                <td style="padding:5px;border:1px solid #ddd;text-align:center">${i + 1}</td>
                <td style="padding:5px;border:1px solid #ddd">${fmtDate(d.date)} ${d.time}</td>
                <td style="padding:5px;border:1px solid #ddd">${d.location}</td>
                <td style="padding:5px;border:1px solid #ddd">${d.problem}</td>
                <td style="padding:5px;border:1px solid #ddd">${d.solution || '-'}</td>
                <td style="padding:5px;border:1px solid #ddd">${d.technician}</td>
                <td style="padding:5px;border:1px solid #ddd;text-align:center">${d.priority}</td>
                <td style="padding:5px;border:1px solid #ddd;text-align:center">${d.status}</td>
            </tr>`;
        });

        h += '</tbody></table></div>';
        const el = document.createElement('div');
        el.innerHTML = h;
        html2pdf().from(el).set({
            margin: 10,
            filename: 'Laporan_Maintenance.pdf',
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
        }).save();
        showToast('PDF diunduh!');
    }
};
