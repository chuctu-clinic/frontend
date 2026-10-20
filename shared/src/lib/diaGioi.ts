// Tỉnh / thành phố và phường / xã dùng cho ô địa chỉ (lấy từ prototype, theo đơn vị hành chính từ 7/2025).
// Phòng khám ở TP. Hồ Chí Minh nên tỉnh này đứng đầu danh sách.
export interface Province {
  name: string;
  wards: string[];
}

export const PROVINCES: Province[] = [
  {
    "name": "TP. Hồ Chí Minh",
    "wards": [
      "Phường Sài Gòn",
      "Phường Bến Thành",
      "Phường Bình Thạnh",
      "Phường Gia Định",
      "Phường Thạnh Mỹ Tây",
      "Phường Bình Lợi Trung"
    ]
  },
  {
    "name": "TP. Hà Nội",
    "wards": [
      "Phường Ba Đình",
      "Phường Hoàn Kiếm",
      "Phường Đống Đa",
      "Phường Cầu Giấy",
      "Phường Tây Hồ"
    ]
  },
  {
    "name": "TP. Đà Nẵng",
    "wards": [
      "Phường Hải Châu",
      "Phường Thanh Khê",
      "Phường Sơn Trà",
      "Phường Ngũ Hành Sơn"
    ]
  },
  {
    "name": "TP. Hải Phòng",
    "wards": [
      "Phường Hồng Bàng",
      "Phường Lê Chân",
      "Phường Ngô Quyền"
    ]
  },
  {
    "name": "TP. Cần Thơ",
    "wards": [
      "Phường Ninh Kiều",
      "Phường Cái Răng",
      "Phường Bình Thủy"
    ]
  },
  {
    "name": "Tỉnh Đồng Nai",
    "wards": [
      "Phường Trấn Biên",
      "Phường Biên Hòa",
      "Phường Long Bình",
      "Xã Long Thành"
    ]
  },
  {
    "name": "Tỉnh Tây Ninh",
    "wards": [
      "Phường Tân Ninh",
      "Phường Long An",
      "Xã Gò Dầu"
    ]
  },
  {
    "name": "Tỉnh Vĩnh Long",
    "wards": [
      "Phường Vĩnh Long",
      "Phường Long Châu",
      "Xã Tam Bình"
    ]
  },
  {
    "name": "Tỉnh An Giang",
    "wards": [
      "Phường Long Xuyên",
      "Phường Châu Đốc",
      "Xã Tân Châu"
    ]
  }
];

/** Ghép địa chỉ cụ thể, phường / xã, tỉnh / thành thành một dòng để lưu. */
export function joinAddress(street: string, ward: string, province: string) {
  return [street.trim(), ward, province].filter(Boolean).join(', ');
}

/** Tách địa chỉ đã lưu về ba phần nếu khớp danh sách; không khớp thì giữ cả dòng ở địa chỉ cụ thể. */
export function splitAddress(address: string | null | undefined) {
  const parts = (address || '').split(',').map((p) => p.trim()).filter(Boolean);
  const province = PROVINCES.find((p) => p.name === parts[parts.length - 1]);
  if (province && parts.length >= 2 && province.wards.includes(parts[parts.length - 2])) {
    return { street: parts.slice(0, -2).join(', '), ward: parts[parts.length - 2], province: province.name };
  }
  return { street: address || '', ward: '', province: PROVINCES[0].name };
}
