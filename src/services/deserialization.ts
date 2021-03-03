class Deserialization {
    public deserializers: { [key: string]: { size: number, parser: (view: DataView, pos: number) => unknown } } = {
        datetime: { size: 4, parser: (view, pos) => new Date(view.getInt32(pos, true) * 1000) },
        byte:     { size: 1, parser: (view, pos) => view.getInt8(pos) },
        boolean:  { size: 1, parser: (view, pos) => view.getInt8(pos) > 0 },
        short:    { size: 2, parser: (view, pos) => view.getInt16(pos, true) },
        int:      { size: 4, parser: (view, pos) => view.getInt32(pos, true) },
        long:     { size: 8, parser: (view, pos) => view.getBigInt64(pos, true) },
        ushort:   { size: 2, parser: (view, pos) => view.getUint16(pos, true) },
        uint:     { size: 4, parser: (view, pos) => view.getUint32(pos, true) },
        ulong:    { size: 8, parser: (view, pos) => view.getBigUint64(pos, true) },
        float:    { size: 4, parser: (view, pos) => view.getFloat32(pos, true) },
        double:   { size: 8, parser: (view, pos) => view.getFloat64(pos, true) },
    };

    public parseTimestamp = (stamp: number) => new Date(stamp * 1000);
    public dateToTimestamp = (date: Date) => Math.floor(date.getTime() / 1000);
}

const _instance = new Deserialization();
export default _instance;