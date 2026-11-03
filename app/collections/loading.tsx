import "./collections.css";

export default function CollectionsLoading() {
  return <div className="collections-page section-wrap collections-loading" role="status" aria-label="Loading collections">
    <div className="collections-loading-breadcrumb" aria-hidden="true" />
    <div className="collections-loading-title" aria-hidden="true" />
    <div className="collections-loading-copy" aria-hidden="true" />
    <div className="collections-loading-heading" aria-hidden="true" />
    <div className="collections-grid" aria-hidden="true"><div className="collections-loading-tile" /><div className="collections-loading-tile" /></div>
  </div>;
}
