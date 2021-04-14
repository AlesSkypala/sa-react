import * as React from 'react';
import './TreeView.css';

type UlProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement>

type LiProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLLIElement>, HTMLLIElement>

/**
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
export class TreeView extends React.PureComponent<UlProps> {
    render() {
        const className = (this.props.className + ' ' ?? '') + 'tree-view';

        return <ul {...this.props} className={className} />;
    }
}

export class TreeItem extends React.PureComponent<LiProps> {
    render () {
        const className = (this.props.className + ' ' ?? '') + 'tree-view-item';

        const children = React.Children.toArray(this.props.children);
        children.unshift(<span className="tree-view-connection"></span>);

        return <li {...this.props} className={className}>{children}</li>;
    }
}
