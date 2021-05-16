import { splitTraceId } from './trace';

export function getLdevMode(trace: Pick<Trace, 'id'>): LdevMapMode | undefined {
    return getLdevModeFromDataset(splitTraceId(trace)[1] as string);
}

export function getLdevModeFromDataset(dataset: string): Exclude<LdevMapMode, 'hostgroup' | 'pool'> | undefined {
    const MPUSets = [
        'PHY_Short_MP',
        'PHY_Cache_Allocate_Each_of_MPU',
        'PHY_Short_Cache_Usage_Rate_Each_of_MPU',
        'PHY_Short_Write_Pending_Rate_Each_of_MPU',
        'PHY_Short_MPPCB_CMPK',
    ];
    
    if (dataset.startsWith('LDEV_')) return 'ldev';
    if (dataset.startsWith('Port_')) return 'port';
    if (dataset.startsWith('PPCGWWN_')) return 'wwn';
    if (dataset.startsWith('PHY_Short_PG')) return 'ecc';

    if (MPUSets.includes(dataset)) return 'mpu';

    return undefined;
}

export function toLdevInternal({ id }: Pick<Trace, 'id'>, mode: LdevMapMode): string {
    return toLdevInternalFromVariant(splitTraceId(id)[2] as string, mode);
}

export function toLdevInternalFromVariant(variant: string, mode: LdevMapMode): string {
    switch (mode) {
        case 'ldev':
            return variant.substr(0, 8).toLowerCase();
        case 'port':
            return variant[2] + variant[4];
        case 'mpu':
            return variant.includes('.') ? variant.split('.')[0] : variant.split(' ')[0];
        case 'wwn':
        {
            const len = variant.indexOf('(');

            return variant.substr(0, len < -1 ? len : undefined).toLowerCase();
        }
        default:
            return variant;
    }
}

export function relatesTo(info: LdevInfo, val: string, mode: LdevMapMode): boolean {
    switch (mode) {
        case 'ldev':
            return info.id === val;
        case 'pool':
            return info.pool?.name === val;
        case 'ecc':
            return Boolean(info.pool?.eccGroups.includes(val));
        case 'hostgroup':
            return info.hostPorts.some(w => w.hostgroup === val);
        case 'mpu':
            return info.mpu === val;
        case 'port':
            return info.hostPorts.some(h => h.port === val);
        case 'wwn':
            return info.wwns.some(w => w.wwn === val);
        default:
            return false;
    }
}
