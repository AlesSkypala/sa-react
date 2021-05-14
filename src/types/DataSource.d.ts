interface DataSource
extends Identified {
    name: string;
    type: string;
    datasets: Dataset[];
    features: string[];
    metadata: { [key: string]: string };
}

interface Dataset
extends Identified {
    source: string;
    category: string[];
    units: string;

    xType: string;
    yType: string;

    dataRange: [ unknown, unknown ][];

    // variants?: string[];
    variantCount: number;
}

interface LdevInfo
{
    // eccGroup: string;
    id: string;
    name: string;
    size: number;
    mpu: string;
    pool: Pool | undefined;

    // hostnames: string[];
    // ports: string[];
    // wwnNames: string[];
    // wwnNicknames: string[];

    hostPorts: HostPort[];
    wwns: WWNInfo[];
}

interface Pool {
    id: number,
    name: string,
    eccGroups: string[],
}

interface HostPort
{
    hostgroup: string;
    port: string;
}

interface WWNInfo
{
    hostgroup: string;
    port: string;
    wwn: string;
    nickname: string;
    location: string;
}

type LdevMapMode =
    | 'ldev'
    | 'hostgroup'
    | 'port'
    | 'pool'
    | 'ecc'
    | 'mpu'
    | 'wwn'
;