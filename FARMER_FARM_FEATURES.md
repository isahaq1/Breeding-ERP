# Farmer & Farm Management Features

## Overview

The Cattle ERP system now includes comprehensive farmer and farm management features, allowing you to:

- **Register farmers** with complete contact information and national ID
- **Manage farms** with geolocation support, facility details, and capacity planning
- **Link farmers to farms** to track farm ownership and management structure
- **Store geospatial data** for mapping and location-based analytics

## Features Added

### 1. Farmer Registration (`/farmers`)

**What you can do:**

- Register new farmers with:
  - Full name (first and last name)
  - Contact information (phone, email)
  - National ID / BVN
  - Farm assignment
  - Additional notes

**Farmer Information:**

- Automatic registration date tracking
- Phone number storage for communication
- Email for digital correspondence
- Farm association for multi-farm operations

### 2. Farm Management (`/farms`)

**What you can do:**

- Register and manage farms with:
  - **Basic Information**
    - Farm name
    - Primary manager/farmer assignment
    - Facility type (Dairy, Beef, Mixed, Breeding)
    - Current status (Active, Inactive, Under Development)

  - **Geolocation Data**
    - Latitude and longitude coordinates
    - Physical address
    - Land area (hectares)
    - Used for location-based planning and mapping

  - **Operational Details**
    - Total area (hectares)
    - Estimated herd size
    - Certifications (ISO 22000, Organic, etc.)
    - Contact person information
    - Operational notes

## Data Structure

### Farmer Type

```typescript
interface Farmer {
  id: string; // Auto-generated: FR-001, FR-002, etc.
  firstName: string; // Farmer's first name
  lastName: string; // Farmer's last name
  email?: string; // Email address (optional)
  phone: string; // Phone number (required)
  farmId: string; // Reference to primary farm
  registrationDate: string; // ISO date format
  idNumber?: string; // National ID or BVN (optional)
  notes?: string; // Additional information (optional)
}
```

### Farm Type

```typescript
interface Farm {
  id: string; // Auto-generated: FM-001, FM-002, etc.
  name: string; // Farm name
  primaryFarmerId: string; // Reference to primary farmer
  location: GeoLocation; // Geolocation details
  registrationDate: string; // ISO date format
  status: "Active" | "Inactive" | "Under Development";
  totalAreaHa: number; // Total land area in hectares
  herdSize: number; // Number of cattle
  facilityType: "Dairy" | "Beef" | "Mixed" | "Breeding";
  certifications?: string; // e.g., "ISO 22000, Organic"
  contactPerson?: string; // Farm contact name
  contactPhone?: string; // Farm contact phone
  notes?: string; // Additional notes
}

interface GeoLocation {
  latitude: number; // Decimal format: 6.5244
  longitude: number; // Decimal format: 3.3792
  address?: string; // Full address
  areaHa?: number; // Land area in hectares
}
```

## How to Use

### Register a New Farmer

1. Navigate to **Farm Setup → Farmers** in the sidebar
2. Click **Register Farmer** button
3. Fill in the form:
   - First Name (required)
   - Last Name (required)
   - Phone Number (required, format: +234-80X-XXX-XXXX)
   - Email (optional)
   - National ID / BVN (optional)
   - Select Farm Assignment (required)
   - Add notes if needed
4. Click **Register** to save

### Register a New Farm

1. Navigate to **Farm Setup → Farms** in the sidebar
2. Click **Add Farm** button
3. Fill in the form:
   - **Basic Info Section**
     - Farm Name (required)
     - Select Primary Manager/Farmer (required)
     - Address/Location description
   - **Geolocation Section**
     - Latitude: Use decimal format (e.g., 6.5244)
     - Longitude: Use decimal format (e.g., 3.3792)
     - 💡 Find coordinates using Google Maps, OpenStreetMap, or a GPS device
   - **Operational Details**
     - Total Area in hectares (required)
     - Estimated Herd Size (required)
     - Facility Type (required): Dairy, Beef, Mixed, or Breeding
     - Status: Active, Inactive, or Under Development
   - **Additional Information**
     - Certifications (optional): e.g., "ISO 22000, Organic Certified"
     - Contact Person (optional)
     - Contact Phone (optional)
     - Notes (optional)

4. Click **Register** to save

### How to Find Coordinates (Geolocation)

**Using Google Maps:**

1. Search for your farm location
2. Right-click on the location
3. The coordinates appear at the top
4. Copy the latitude and longitude (decimal format)

**Example Coordinates:**

- Oyo State, Nigeria: 6.5244°N, 3.3792°E
- Lagos State, Nigeria: 6.4521°N, 3.4156°E

## Seed Data

The system comes with 3 sample farms and 4 sample farmers:

**Farms:**

- **Greenfield Ranch** (FM-001) - Mixed facility, 45.5 ha, 32 animals, Oyo State
- **Meadowbrook Dairy** (FM-002) - Dairy facility, 28 ha, 22 animals, Lagos State
- **Highveld Pastures** (FM-003) - Beef facility, 62 ha, 48 animals, Osun State

**Farmers:**

- **Omotunde Adeyemi** (FR-001) - Manager at Greenfield Ranch
- **Chioma Okonkwo** (FR-002) - Manager at Meadowbrook Dairy
- **Tunde Oladele** (FR-003) - Manager at Highveld Pastures
- **Bola Adebayo** (FR-004) - Farm manager at Greenfield Ranch

## Search and Filter

- **Farmers Page**: Search by name or phone number
- **Farms Page**: Search by farm name or location/address

## Edit and Delete

- Click the **Edit** (pencil) icon to modify farmer or farm details
- Click the **Delete** (trash) icon to remove a farmer or farm
- Changes are saved to localStorage automatically

## Integration with Other Modules

### Linking Farms and Cattle

Currently, farmers and farms are separate from the cattle registry. Future enhancements will allow:

- Assigning cattle to specific farms
- Multi-farm herd management
- Per-farm analytics and reporting

### Reporting Features

Use farm geolocation data for:

- Location-based herd analysis
- Geographic distribution reports
- Farm capacity planning
- Route optimization for farm visits

## Technical Details

### Storage

- Data is stored in browser localStorage
- Automatically persisted on changes
- Survives page refresh
- Each browser has separate data

### IDs

- **Farmer IDs**: FR-001, FR-002, FR-003... (auto-incrementing)
- **Farm IDs**: FM-001, FM-002, FM-003... (auto-incrementing)
- Generated sequentially based on existing records

### Dates

- **Registration Date**: Set automatically when creating records
- Format: YYYY-MM-DD (ISO 8601)
- Used for tracking record creation timeline

## Best Practices

1. **Complete Information**: Enter all available details for better farm management
2. **Accurate Coordinates**: Use GPS or online maps for precise geolocation
3. **Regular Updates**: Keep farmer contact information and farm status current
4. **Notes**: Use the notes field to record special instructions or farm characteristics
5. **Facility Classification**: Choose accurate facility type for proper categorization

## Future Enhancements

Planned features:

- Map visualization of farm locations
- Farm-specific health and breeding records
- Multi-farm user permissions
- GPS-based farm attendance tracking
- Satellite imagery integration for pasture analysis
