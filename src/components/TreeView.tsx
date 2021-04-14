import * as React from 'react';
import './TreeView.css';

type UlProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement>;
type LiProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLLIElement>, HTMLLIElement>;

interface TreeViewProps extends UlProps {
    connectionColor?: string;
}

/**
 * @property `connectionColor`
 *  The color of the dashed lines that connect `TreeItem`s to their parent,
 *  currently not inherited.
 *
 * @example
 * <TreeView>
 *   <TreeItem>first</TreeItem>
 *   <TreeItem>second
 *     <TreeView>
 *       <TreeItem>third</TreeItem>
 *     </TreeView>
 *   </TreeItem>
 * </TreeView>
 */
export class TreeView extends React.PureComponent<TreeViewProps> {
    render() {
        let { className, style } = this.props;
        const { connectionColor } = this.props;

        className = (className ? className + ' ' : '') + 'tree-view';

        style = {
            ... connectionColor ? { '--connection-color': connectionColor } : {},
            ... style
        };

        return <ul {...this.props} className={className} style={style} />;
    }
}

export class TreeItem extends React.PureComponent<LiProps> {
    render () {
        const children = React.Children.toArray(this.props.children);
        children.unshift(<span className="tree-view-connection-horizontal"></span>);
        children.unshift(<span className="tree-view-connection-vertical"></span>);

        return <li {...this.props}>{children}</li>;
    }
}
