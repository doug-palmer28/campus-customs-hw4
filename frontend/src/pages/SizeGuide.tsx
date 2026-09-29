export default function SizeGuide() {
  return (
    <div className="page info-page">
      <h1>Size Guide</h1>
      <p>
        Our apparel runs true to size with a relaxed, comfortable fit. Use the
        chest measurements below as a guide — when you're between sizes, we
        recommend sizing up for a roomier layering fit.
      </p>

      <table className="size-table">
        <thead>
          <tr>
            <th>Size</th>
            <th>Chest (in.)</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>XS</td><td>32–34</td><td>Extra small</td></tr>
          <tr><td>S</td><td>35–37</td><td>Small</td></tr>
          <tr><td>M</td><td>38–41</td><td>Medium</td></tr>
          <tr><td>L</td><td>42–45</td><td>Large</td></tr>
          <tr><td>XL</td><td>46–49</td><td>Extra large</td></tr>
          <tr><td>XXL</td><td>50–53</td><td>Double extra large</td></tr>
        </tbody>
      </table>

      <p className="muted">
        Measurements are approximate and can vary slightly by garment style.
        Each product page shows exactly which sizes are in stock.
      </p>
    </div>
  );
}
