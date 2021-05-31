import { faCaretRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { Item, Menu, Separator, Submenu, TriggerEvent, useContextMenu,  } from 'react-contexify';
import { createPortal } from 'react-dom';

function MenuPortal({ children }: { children: React.ReactNode }) {
    const elem = document.getElementById('context-menu');
    return elem ? createPortal(children, elem) : <>{children}</>;
}

interface Props {
    id: string;
    darkMode?: boolean;
    tree: Leaf[];
}

type LeafItem<T> = {
    type: 'item',
    text: React.ReactNode,
    show?: boolean,
    disabled?: boolean,
    data?: T,
    onClick?: (params: { data?: T }) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Leaf = LeafItem<any> | {
    type: 'submenu',
    text: React.ReactNode,
    children: Leaf[],
    show?: boolean,
    onClick?: () => void;
} | {
    type: 'separator',
    show?: boolean,
};

class ContextMenu extends React.PureComponent<Props> {

    static invoker<T = unknown>(id: string, props?: T): ((e: TriggerEvent) => void) {
        return useContextMenu({ id, props }).show;
    }

    public render() {
        const { darkMode, id, tree } = this.props;
        const arrow = <FontAwesomeIcon icon={faCaretRight} />;

        const renderLeaf = (branch: Leaf, level: number, idx: number) => {
            if (branch.show === false) return undefined;

            const key = Math.pow(100, level) + idx;
            if (branch.type === 'separator') return <Separator key={key} />;
            if (branch.type === 'item') {
                return <Item key={key} onClick={branch.onClick} data={branch.data} disabled={branch.disabled}>{branch.text}</Item>;
            }
            if (branch.type === 'submenu') {
                return (
                    <Submenu key={key} label={branch.text} onClick={branch.onClick} arrow={arrow} >
                        {branch.children.map((c, i) => renderLeaf(c, level + 1, i))}
                    </Submenu>
                );
            }
        };

        return (
            <MenuPortal>
                <Menu id={id} theme={darkMode ? 'dark' : 'light'} animation={false} dir='up'>
                    {tree.map((l, i) => renderLeaf(l, 0, i))}
                </Menu>
            </MenuPortal>
        );
    }
}

export default ContextMenu;