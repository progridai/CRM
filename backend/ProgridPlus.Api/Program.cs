using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProgridPlus.Api.Auth;
using ProgridPlus.Api.Contatos;
using ProgridPlus.Api.Data;
using ProgridPlus.Api.Seguranca;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// IHttpContextAccessor: necessario para o CrmAcessoHandler disponibilizar o UsuarioId
builder.Services.AddHttpContextAccessor();

// CORS Config
var frontendOrigin = builder.Configuration.GetValue<string>("Cors:FrontendOrigin") ?? "http://localhost:5174";
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(frontendOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Missing DefaultConnection string");

// AppDbContext: acesso de leitura ao schema seguranca (tabela usuario).
// Nao gerencia migrations - o schema seguranca e de responsabilidade do WebApolice.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// CrmDbContext: responsavel exclusivamente pelo schema crm.
// Todas as migrations do CRM sao aplicadas por este contexto.
builder.Services.AddDbContext<CrmDbContext>(options =>
    options.UseNpgsql(connectionString,
        npgsql => npgsql.MigrationsHistoryTable("__efmigrationshistory", "crm")));

// SegurancaConsulta: executa a query de acesso CRM no schema seguranca (somente leitura).
// Registrado como Scoped para ter a mesma vida util da request HTTP.
builder.Services.AddScoped<SegurancaConsulta>();

// ContatosConsulta: executa queries de leitura no schema core.pessoa / core.pessoa_contato.
// Somente leitura — o CRM não cria tabela própria de contatos.
builder.Services.AddScoped<ContatosConsulta>();

// NegociosConsulta: executa queries de leitura no schema crm.
builder.Services.AddScoped<ProgridPlus.Api.Negocios.NegociosConsulta>();

// NegocioComando: serviço de escrita no schema crm (criação de negócios).
builder.Services.AddScoped<ProgridPlus.Api.Negocios.NegocioComando>();


// Authentication via Keycloak JWT Bearer
var authority = builder.Configuration.GetValue<string>("Authentication:Authority")
    ?? throw new InvalidOperationException("Missing Authentication:Authority");
var audience = builder.Configuration.GetValue<string>("Authentication:Audience") ?? "account";
var requireHttps = builder.Configuration.GetValue<bool>("Authentication:RequireHttpsMetadata");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = authority;
        options.RequireHttpsMetadata = requireHttps;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = authority,
            ValidateAudience = true,
            ValidAudiences = new[] { audience, "webapolice-web", "account" },
            ValidateLifetime = true,
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogWarning("JWT auth failed: {Error}", ctx.Exception.Message);
                return Task.CompletedTask;
            }
        };
    });

// Transforma realm_access.roles em ClaimTypes.Role do .NET
builder.Services.AddTransient<IClaimsTransformation, TransformadorRolesDoRealm>();

// Authorization: policy "CrmAcesso" - valida acesso ao CRM via seguranca.usuario
builder.Services.AddScoped<IAuthorizationHandler, CrmAcessoHandler>();
builder.Services.AddAuthorization(options =>
{
    // Policy padrao: qualquer endpoint [Authorize] sem policy explicita exige CrmAcesso
    options.DefaultPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .AddRequirements(new CrmAcessoRequirement())
        .Build();

    // Policy nomeada para uso explicito: [Authorize(Policy = "CrmAcesso")]
    options.AddPolicy("CrmAcesso", policy =>
        policy.RequireAuthenticatedUser()
              .AddRequirements(new CrmAcessoRequirement()));
});

var app = builder.Build();

// Aplica migrations do schema crm automaticamente na inicializacao.
// O schema seguranca e gerenciado exclusivamente pelo WebApolice.
using (var scope = app.Services.CreateScope())
{
    try
    {
        var crmDb = scope.ServiceProvider.GetRequiredService<CrmDbContext>();
        crmDb.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Falha ao aplicar migrations do schema crm. Verifique a connection string.");
    }
}

app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();