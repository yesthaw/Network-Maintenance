// ==================== DROPDOWN CONFIG ====================
// File ini berisi semua opsi dropdown
// Edit file ini untuk menambah/mengubah pilihan
// Tidak perlu edit index.html!

const DROPDOWN = {

    // ==================== PEMERIKSAAN + ITEM PEMERIKSAAN ====================
    // Dropdown "Item Pemeriksaan" otomatis MENYESUAIKAN (tersortir) sesuai
    // Pemeriksaan yang dipilih. Contoh: pilih "MikroTik / Router" -> hanya
    // item milik router (CPU Usage, RAM Usage, dst) yang muncul.
    pemeriksaan: [
        { name: 'Internet / WAN', items: [
            'Status koneksi ISP', 'IP Public/WAN', 'Gateway ISP',
            'Ping Gateway / Local', 'DNS Resolution', 'Bandwidth Internet'
        ]},
        { name: 'MikroTik / Router', items: [
            'CPU Usage', 'RAM Usage', 'Temperature', 'Uptime',
            'Interface Status', 'Interface Traffic', 'IP Address',
            'Routing Table', 'Default Route', 'NAT', 'Firewall', 'DHCP Server',
            'DNS', 'ARP Table', 'System Log Firewall', 'NAT Rule', 'VPN',
            'User Authentication', 'Unauthorized Device', 'Open Port',
            'Admin Account', 'Password Policy'
        ]},
        { name: 'Switch / HUB', items: [
            'Power Status', 'Port Status', 'Port Error', 'Port Traffic',
            'STP Status', 'PoE Status'
        ]},
        { name: 'VLAN', items: [
            'VLAN ID', 'VLAN Name', 'VLAN Gateway', 'VLAN DHCP',
            'Inter-VLAN Routing', 'VLAN Trunk', 'VLAN Access Port',
            'VLAN Connectivity', 'VLAN Configuration', 'Trunk Port'
        ]},
        { name: 'Wi-Fi / Access Point', items: [
            'AP Online/Offline', 'SSID', 'Channel', 'Signal Strength',
            'Connected Client', 'Client Count', 'Bandwidth', 'Roaming',
            'AP Temperature'
        ]},
        { name: 'Server Network', items: [
            'Server Connectivity', 'Server IP', 'Gateway', 'DNS', 'Ping',
            'Network Interface', 'Interface Speed', 'Packet Loss'
        ]},
        { name: 'Kabel & Infrastruktur', items: [
            'Kabel LAN', 'Connector RJ45', 'Patch Panel', 'Rack',
            'Patch Cord', 'Fiber Optic', 'SFP', 'Label Kabel', 'Kondisi Fisik'
        ]},
        { name: 'Monitoring & Logging', items: [
            'Router Monitoring', 'Switch Monitoring', 'AP Monitoring',
            'Bandwidth Monitoring', 'CPU/RAM Monitoring', 'System Log',
            'Error Log', 'Alert'
        ]},
        { name: 'Backup & Configuration & Update', items: [
            'Backup MikroTik', 'Backup Switch', 'Backup AP', 'Backup Firewall',
            'Configuration Version', 'Backup Location', 'Backup Date',
            'Update Router'
        ]},
        { name: 'Dokumentasi', items: [
            'Topologi Jaringan', 'IP Address List', 'VLAN List',
            'Device Inventory', 'Network Diagram', 'Password/Access Record',
            'Maintenance History'
        ]}
    ],

    // ==================== STATUS ====================
    status: [
        'Pending',
        'Dalam Proses',
        'Selesai'
    ],

    // ==================== HELPER ====================

    namaPemeriksaan: function() {
        return this.pemeriksaan.map(p => p.name);
    },

    itemDari: function(nama) {
        const p = this.pemeriksaan.find(x => x.name === nama);
        return p ? p.items.slice() : [];
    },

    semuaItem: function() {
        const out = [];
        this.pemeriksaan.forEach(p => p.items.forEach(i => {
            if (!out.includes(i)) out.push(i);
        }));
        return out;
    },

    // ==================== RENDER FUNCTIONS ====================

    // Generate options HTML untuk select
    renderOptions: function(list, placeholder) {
        let html = placeholder ? '<option value="">' + placeholder + '</option>' : '';
        list.forEach(function(item) {
            html += '<option>' + item + '</option>';
        });
        return html;
    },

    // Generate options untuk filter (dengan "Semua" option)
    renderFilterOptions: function(list, label) {
        let html = '<option value="">Semua ' + (label || '') + '</option>';
        list.forEach(function(item) {
            html += '<option value="' + item + '">' + item + '</option>';
        });
        return html;
    },

    // Helper: set innerHTML jika element ada
    set: function(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    },

    // ==================== SORTIR ITEM SESUAI PEMERIKSAAN ====================
    // Isi dropdown Item Pemeriksaan dengan item milik pemeriksaan terpilih.
    // nilaiSekarang = item yang dipilih otomatis (dipakai saat edit data lama;
    // item lama yang tidak ada di daftar baru tetap ditawarkan supaya tidak hilang).
    isiItem: function(selectId, namaPemeriksaan, nilaiSekarang) {
        const el = document.getElementById(selectId);
        if (!el) return;
        let items = this.itemDari(namaPemeriksaan);
        if (nilaiSekarang && !items.includes(nilaiSekarang)) items = [nilaiSekarang].concat(items);
        el.innerHTML = this.renderOptions(items, namaPemeriksaan ? 'Pilih Item' : 'Pilih Pemeriksaan dulu');
        el.disabled = !namaPemeriksaan;
        if (nilaiSekarang) el.value = nilaiSekarang;
    },

    // Hubungkan dropdown Pemeriksaan -> dropdown Item:
    // setiap kali pemeriksaan diganti, isi dropdown item ikut tersortir.
    hubungkan: function(catId, itemId) {
        const cat = document.getElementById(catId);
        if (!cat) return;
        const self = this;
        cat.onchange = function() { self.isiItem(itemId, cat.value, ''); };
    },

    // ==================== POPULATE ALL DROPDOWNS ====================
    // Fungsi ini dipanggil saat halaman dimuat
    populateAll: function() {
        // Form Tambah
        this.set('formCategory', this.renderOptions(this.namaPemeriksaan(), 'Pilih Pemeriksaan'));
        this.isiItem('formPriority', '', '');
        this.hubungkan('formCategory', 'formPriority');

        // Modal Edit
        this.set('modalCategory', this.renderOptions(this.namaPemeriksaan(), 'Pilih Pemeriksaan'));
        this.isiItem('modalPriority', '', '');
        this.hubungkan('modalCategory', 'modalPriority');

        // Status
        this.set('formStatus', this.renderOptions(this.status));
        this.set('modalStatus', this.renderOptions(this.status));

        // Filter Data (filter item juga tersortir mengikuti filter pemeriksaan)
        this.set('filterCategory', this.renderFilterOptions(this.namaPemeriksaan(), 'Pemeriksaan'));
        // Filter status: opsi khusus "Belum Selesai" (Pending + Dalam Proses)
        // dipasang paling atas — jadi default halaman Data Maintenance,
        // sehingga yang tampil adalah pekerjaan yang belum rampung.
        // Data "Selesai" tetap bisa dilihat dengan memilih filter Selesai / Semua.
        this.set('filterStatus', '<option value="__belum">Belum Selesai</option>' + this.renderFilterOptions(this.status, 'Status'));
        this.set('filterPriority', this.renderFilterOptions(this.semuaItem(), 'Item'));
        const fc = document.getElementById('filterCategory');
        if (fc) {
            const self = this;
            fc.onchange = function() {
                const fpr = document.getElementById('filterPriority');
                if (!fpr) return;
                fpr.value = '';
                fpr.innerHTML = self.renderFilterOptions(
                    fc.value ? self.itemDari(fc.value) : self.semuaItem(), 'Item');
            };
        }
    }
};
